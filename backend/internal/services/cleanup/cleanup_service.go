package cleanup

import (
	"context"
	"fmt"
	"log"
	"time"

	"ecommerce-backend/internal/repositories"
	"ecommerce-backend/pkg/storage"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

// CleanupService handles background cleanup jobs
type CleanupService struct {
	db       *gorm.DB
	tempRepo *repositories.TempUploadRepository
	imageSvc *storage.ImageService
	redis    *redis.Client
}

// NewCleanupService creates a new cleanup service
func NewCleanupService(
	db *gorm.DB,
	tempRepo *repositories.TempUploadRepository,
	imageSvc *storage.ImageService,
	redis *redis.Client,
) *CleanupService {
	return &CleanupService{
		db:       db,
		tempRepo: tempRepo,
		imageSvc: imageSvc,
		redis:    redis,
	}
}

// StartBackgroundJobs starts all scheduled cleanup jobs in background goroutines.
func (s *CleanupService) StartBackgroundJobs() {
	go s.runEvery(2*time.Hour, "cleanup:expired-temp-uploads", s.cleanExpiredTempUploads)
	go s.runEvery(24*time.Hour, "cleanup:expired-tokens", s.cleanExpiredTokens)
	go s.runEvery(7*24*time.Hour, "cleanup:soft-deleted", s.cleanSoftDeleted)
}

// runEvery runs fn on interval, protected by a Redis distributed lock.
func (s *CleanupService) runEvery(interval time.Duration, lockKey string, fn func()) {
	// Run once on startup
	s.withLock(lockKey, fn)

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for range ticker.C {
		s.withLock(lockKey, fn)
	}
}

// withLock acquires a Redis distributed lock before executing fn.
func (s *CleanupService) withLock(key string, fn func()) {
	ctx := context.Background()
	// NX = only set if not exists → distributed lock
	ok, err := s.redis.SetNX(ctx, key, "1", 10*time.Minute).Result()
	if err != nil || !ok {
		return // another instance holds the lock
	}
	defer s.redis.Del(ctx, key)
	fn()
}

// cleanExpiredTempUploads deletes SeaweedFS files that were uploaded but never claimed.
// Batch size: 500 rows per iteration.
func (s *CleanupService) cleanExpiredTempUploads() {
	log.Println("[CleanupJob] expired-temp-uploads: starting")
	total := 0

	for {
		uploads, err := s.tempRepo.GetExpiredUnclaimed(500)
		if err != nil {
			log.Printf("[CleanupJob] expired-temp-uploads: query failed: %v", err)
			break
		}

		if len(uploads) == 0 {
			break
		}

		for _, upload := range uploads {
			if err := s.imageSvc.DeleteFromSeaweedFS(upload.ImageURL); err != nil {
				log.Printf("[CleanupJob] expired-temp-uploads: delete failed %s: %v", upload.ImageURL, err)
				continue
			}

			if err := s.tempRepo.DeleteByID(upload.ID); err != nil {
				log.Printf("[CleanupJob] expired-temp-uploads: db delete failed %s: %v", upload.ID, err)
				continue
			}
			total++
		}
	}

	log.Printf("[CleanupJob] expired-temp-uploads: done, removed %d files", total)
}

// cleanExpiredTokens removes expired refresh tokens and reset tokens in batches.
// Runs daily during low traffic (next iteration of ticker), batch size: 500 rows.
func (s *CleanupService) cleanExpiredTokens() {
	log.Println("[CleanupJob] expired-tokens: starting")

	tables := []struct {
		table  string
		column string
	}{
		{"refresh_tokens", "expires_at"},
		{"password_reset_tokens", "expires_at"},
		{"email_verification_tokens", "expires_at"},
	}

	for _, t := range tables {
		total := 0
		for {
			res := s.db.Exec(`
				DELETE FROM ` + t.table + `
				WHERE id IN (
					SELECT id FROM ` + t.table + `
					WHERE ` + t.column + ` < NOW()
					LIMIT 500
				)
			`)
			total += int(res.RowsAffected)
			if res.RowsAffected == 0 {
				break
			}
		}
		log.Printf("[CleanupJob] expired-tokens: %s removed %d rows", t.table, total)
	}
}

// cleanSoftDeleted removes soft-deleted records older than retention window (default: 30 days).
// Runs weekly to prevent soft-deleted data from accumulating indefinitely.
func (s *CleanupService) cleanSoftDeleted() {
	log.Println("[CleanupJob] soft-deleted: starting")

	// Tables with soft-delete support (deleted_at column)
	tables := []string{
		"products",
		"product_images",
		"categories",
		"addresses",
		"newsletters",
		"users",
	}

	retentionDays := 30

	for _, table := range tables {
		total := 0
		for {
			// Hard-delete soft-deleted records older than retention window
			res := s.db.Exec(`
				DELETE FROM `+table+`
				WHERE id IN (
					SELECT id FROM `+table+`
					WHERE deleted_at IS NOT NULL
					  AND deleted_at < NOW() - INTERVAL '` + fmt.Sprint(retentionDays) + ` days'
					LIMIT 500
				)
			`)
			total += int(res.RowsAffected)
			if res.RowsAffected == 0 {
				break
			}
		}
		if total > 0 {
			log.Printf("[CleanupJob] soft-deleted: %s removed %d rows (older than %d days)", table, total, retentionDays)
		}
	}

	log.Println("[CleanupJob] soft-deleted: completed")
}
