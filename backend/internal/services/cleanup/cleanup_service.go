package cleanup

import (
	"context"
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
	go s.runEvery(15*time.Minute, "cleanup:expired-pending-orders", s.cleanExpiredPendingOrders)
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

// cleanExpiredPendingOrders cancels unpaid pending orders whose reserved payment
// window has expired and returns their reserved stock.
func (s *CleanupService) cleanExpiredPendingOrders() {
	log.Println("[CleanupJob] expired-pending-orders: starting")
	total := 0

	for {
		processed, err := s.cancelExpiredPendingOrderBatch(100)
		if err != nil {
			log.Printf("[CleanupJob] expired-pending-orders: batch failed: %v", err)
			break
		}
		total += processed
		if processed == 0 {
			break
		}
	}

	log.Printf("[CleanupJob] expired-pending-orders: completed, cancelled %d orders", total)
}

func (s *CleanupService) cancelExpiredPendingOrderBatch(limit int) (int, error) {
	type expiredOrder struct {
		ID string
	}

	cancelled := 0
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var orders []expiredOrder
		if err := tx.Raw(`
			SELECT id
			FROM orders
			WHERE order_status = 'pending'
			  AND payment_status IN ('unpaid', 'pending_payment', 'expired', 'failed')
			  AND payment_expires_at IS NOT NULL
			  AND payment_expires_at < NOW()
			ORDER BY payment_expires_at ASC
			LIMIT ?
			FOR UPDATE SKIP LOCKED
		`, limit).Scan(&orders).Error; err != nil {
			return err
		}

		for _, order := range orders {
			if err := s.restoreOrderStock(tx, order.ID); err != nil {
				return err
			}

			res := tx.Exec(`
				UPDATE orders
				SET order_status = 'cancelled',
				    payment_status = 'expired',
				    cancellation_reason = 'Payment window expired',
				    cancelled_at = NOW(),
				    snap_token = '',
				    snap_token_created_at = NULL,
				    payment_expires_at = NULL,
				    updated_at = NOW()
				WHERE id = ?
				  AND order_status = 'pending'
				  AND payment_status IN ('unpaid', 'pending_payment', 'expired', 'failed')
			`, order.ID)
			if res.Error != nil {
				return res.Error
			}
			if res.RowsAffected == 0 {
				continue
			}

			if err := tx.Exec(`
				INSERT INTO order_status_workflows (id, order_id, from_status, to_status, notes, changed_at)
				VALUES (uuid_generate_v4(), ?, 'pending', 'cancelled', 'Payment window expired', NOW())
			`, order.ID).Error; err != nil {
				return err
			}
			cancelled++
		}

		return nil
	})

	return cancelled, err
}

func (s *CleanupService) restoreOrderStock(tx *gorm.DB, orderID string) error {
	if err := tx.Exec(`
		UPDATE products p
		SET stock_quantity = p.stock_quantity + oi.quantity,
		    updated_at = NOW()
		FROM order_items oi
		WHERE oi.order_id = ?
		  AND oi.product_id = p.id
	`, orderID).Error; err != nil {
		return err
	}

	return tx.Exec(`
		UPDATE product_variant_combinations pvc
		SET stock_quantity = pvc.stock_quantity + oi.quantity,
		    updated_at = NOW()
		FROM order_items oi
		WHERE oi.order_id = ?
		  AND oi.combination_id IS NOT NULL
		  AND oi.combination_id = pvc.id
	`, orderID).Error
}

// cleanExpiredTokens removes expired refresh tokens and reset tokens in batches.
// Runs daily during low traffic (next iteration of ticker), batch size: 500 rows.
func (s *CleanupService) cleanExpiredTokens() {
	log.Println("[CleanupJob] expired-tokens: starting")

	total, err := s.deleteExpiredRows("refresh_tokens", "expires_at")
	if err != nil {
		log.Printf("[CleanupJob] expired-tokens: refresh_tokens failed: %v", err)
	} else {
		log.Printf("[CleanupJob] expired-tokens: refresh_tokens removed %d rows", total)
	}

	total, err = s.clearExpiredUserTokenColumns(
		"password_reset_token",
		"password_reset_expires_at",
		"expired password reset tokens",
	)
	if err != nil {
		log.Printf("[CleanupJob] expired-tokens: password reset cleanup failed: %v", err)
	} else {
		log.Printf("[CleanupJob] expired-tokens: cleared %d expired password reset tokens", total)
	}

	total, err = s.clearExpiredEmailVerificationTokens()
	if err != nil {
		log.Printf("[CleanupJob] expired-tokens: email verification cleanup failed: %v", err)
	} else {
		log.Printf("[CleanupJob] expired-tokens: cleared %d expired email verification tokens", total)
	}

	log.Println("[CleanupJob] expired-tokens: completed")
}

// cleanSoftDeleted removes soft-deleted records older than retention window (default: 30 days).
// Runs weekly to prevent soft-deleted data from accumulating indefinitely.
func (s *CleanupService) cleanSoftDeleted() {
	log.Println("[CleanupJob] soft-deleted: starting")

	// Tables with soft-delete support (deleted_at column)
	tables := []string{
		"products",
		"categories",
		"addresses",
		"newsletter_subscriptions",
		"users",
	}

	retentionDays := 30

	for _, table := range tables {
		total, err := s.deleteSoftDeletedRows(table, retentionDays)
		if err != nil {
			log.Printf("[CleanupJob] soft-deleted: %s failed: %v", table, err)
			continue
		}
		if total > 0 {
			log.Printf("[CleanupJob] soft-deleted: %s removed %d rows (older than %d days)", table, total, retentionDays)
		}
	}

	log.Println("[CleanupJob] soft-deleted: completed")
}

func (s *CleanupService) deleteExpiredRows(table string, expiresColumn string) (int, error) {
	total := 0

	for {
		res := s.db.Exec(`
			DELETE FROM ` + table + `
			WHERE id IN (
				SELECT id FROM ` + table + `
				WHERE ` + expiresColumn + ` < NOW()
				LIMIT 500
			)
		`)
		if res.Error != nil {
			return total, res.Error
		}

		total += int(res.RowsAffected)
		if res.RowsAffected == 0 {
			return total, nil
		}
	}
}

func (s *CleanupService) clearExpiredUserTokenColumns(tokenColumn string, expiresColumn string, label string) (int, error) {
	total := 0

	for {
		res := s.db.Exec(`
			UPDATE users
			SET ` + tokenColumn + ` = NULL,
			    ` + expiresColumn + ` = NULL
			WHERE id IN (
				SELECT id FROM users
				WHERE ` + tokenColumn + ` IS NOT NULL
				  AND ` + expiresColumn + ` < NOW()
				LIMIT 500
			)
		`)
		if res.Error != nil {
			return total, res.Error
		}

		total += int(res.RowsAffected)
		if res.RowsAffected == 0 {
			return total, nil
		}

		log.Printf("[CleanupJob] expired-tokens: %s cleared batch of %d rows", label, res.RowsAffected)
	}
}

func (s *CleanupService) clearExpiredEmailVerificationTokens() (int, error) {
	total := 0

	for {
		res := s.db.Exec(`
			UPDATE users
			SET email_verification_token = NULL,
			    email_verification_code = NULL,
			    email_verification_expires_at = NULL,
			    email_verification_attempts = 0
			WHERE id IN (
				SELECT id FROM users
				WHERE email_verification_token IS NOT NULL
				  AND email_verification_expires_at < NOW()
				LIMIT 500
			)
		`)
		if res.Error != nil {
			return total, res.Error
		}

		total += int(res.RowsAffected)
		if res.RowsAffected == 0 {
			return total, nil
		}

		log.Printf("[CleanupJob] expired-tokens: expired email verification tokens cleared batch of %d rows", res.RowsAffected)
	}
}

func (s *CleanupService) deleteSoftDeletedRows(table string, retentionDays int) (int, error) {
	total := 0

	for {
		res := s.db.Exec(`
			DELETE FROM `+table+`
			WHERE id IN (
				SELECT id FROM `+table+`
				WHERE deleted_at IS NOT NULL
				  AND deleted_at < NOW() - ($1 * INTERVAL '1 day')
				LIMIT 500
			)
		`, retentionDays)
		if res.Error != nil {
			return total, res.Error
		}

		total += int(res.RowsAffected)
		if res.RowsAffected == 0 {
			return total, nil
		}
	}
}
