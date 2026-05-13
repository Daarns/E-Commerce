package storage

import (
	"bytes"
	"context"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	webpEncoder "github.com/chai2010/webp"
	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"gorm.io/gorm"
)

// ImageService handles image operations including optimization and uploads.
type ImageService struct {
	endpoint        string // SeaweedFS S3 endpoint, e.g. "seaweedfs:8333"
	accessKeyID     string
	secretAccessKey string
	bucketName      string
	publicBaseURL   string // public-facing URL base, e.g. "http://localhost:8333"
	useSeaweedFS    bool
}

// ImageUploadResult represents the result of an image upload.
type ImageUploadResult struct {
	ID           uuid.UUID `json:"id"`
	URL          string    `json:"url"`
	AltText      string    `json:"alt_text"`
	IsPrimary    bool      `json:"is_primary"`
	DisplayOrder int       `json:"display_order"`
}

// NewImageService creates an ImageService backed by SeaweedFS (S3-compatible).
//
// Reads from env vars:
//
//	SEAWEEDFS_ENDPOINT      — internal Docker endpoint, e.g. "seaweedfs:8333"
//	SEAWEEDFS_ACCESS_KEY    — access key defined in s3.json
//	SEAWEEDFS_SECRET_KEY    — secret key defined in s3.json
//	SEAWEEDFS_BUCKET        — bucket name, e.g. "product-images"
//	SEAWEEDFS_PUBLIC_URL    — public base URL, e.g. "http://localhost:8333"
//
// Falls back to local disk storage if any required var is missing.
func NewImageService(endpoint, accessKey, secretKey string) *ImageService {
	bucket := os.Getenv("SEAWEEDFS_BUCKET")
	publicURL := os.Getenv("SEAWEEDFS_PUBLIC_URL")

	useSeaweedFS := endpoint != "" && accessKey != "" && secretKey != "" && bucket != ""

	return &ImageService{
		endpoint:        endpoint,
		accessKeyID:     accessKey,
		secretAccessKey: secretKey,
		bucketName:      bucket,
		publicBaseURL:   publicURL,
		useSeaweedFS:    useSeaweedFS,
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

// ValidateImageFiles validates a slice of uploaded files.
func (s *ImageService) ValidateImageFiles(files []*multipart.FileHeader) []error {
	var errs []error
	if len(files) == 0 {
		errs = append(errs, fmt.Errorf("at least one image file is required"))
		return errs
	}
	if len(files) > 10 {
		errs = append(errs, fmt.Errorf("maximum 10 images allowed per product"))
		return errs
	}
	for i, file := range files {
		if err := s.validateSingleFile(file, i); err != nil {
			errs = append(errs, err)
		}
	}
	return errs
}

func (s *ImageService) validateSingleFile(file *multipart.FileHeader, index int) error {
	const maxSize = 10 * 1024 * 1024
	if file.Size > maxSize {
		return fmt.Errorf("image[%d]: file size exceeds maximum (10MB)", index)
	}
	if file.Size < 1024 {
		return fmt.Errorf("image[%d]: file is too small (min 1KB)", index)
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowed := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true, ".gif": true}
	if !allowed[ext] {
		return fmt.Errorf("image[%d]: unsupported file type %q", index, ext)
	}

	f, err := file.Open()
	if err != nil {
		return fmt.Errorf("image[%d]: cannot open file", index)
	}
	defer f.Close()

	// Do not limit to 512 bytes because JPEGs from iPhones have huge EXIF headers (> 64KB)
	_, format, err := image.DecodeConfig(f)
	if err != nil {
		return fmt.Errorf("image[%d]: invalid image data", index)
	}
	okFormats := map[string]bool{"jpeg": true, "png": true, "gif": true, "webp": true}
	if !okFormats[format] {
		return fmt.Errorf("image[%d]: unsupported image format %q", index, format)
	}
	return nil
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversion: any image → WebP
// ─────────────────────────────────────────────────────────────────────────────

// ConvertToWebP reads any supported image and re-encodes it as WebP.
// quality: 0–100 (85 is a good default).
func (s *ImageService) ConvertToWebP(file *multipart.FileHeader, quality float32) ([]byte, error) {
	f, err := file.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %w", err)
	}
	defer f.Close()

	data, err := io.ReadAll(f)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("failed to decode image: %w", err)
	}

	var buf bytes.Buffer
	if err := webpEncoder.Encode(&buf, img, &webpEncoder.Options{
		Lossless: false,
		Quality:  quality,
	}); err != nil {
		return nil, fmt.Errorf("failed to encode WebP: %w", err)
	}
	return buf.Bytes(), nil
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage
// ─────────────────────────────────────────────────────────────────────────────

// SaveImageToStorage converts the image to WebP and saves it.
// Returns the public URL of the saved image.
func (s *ImageService) SaveImageToStorage(file *multipart.FileHeader) (string, error) {
	webpData, err := s.ConvertToWebP(file, 85)
	if err != nil {
		return "", fmt.Errorf("image conversion failed: %w", err)
	}

	// Build unique filename
	timestamp := time.Now().Unix()
	base := s.SanitizeFilename(strings.TrimSuffix(file.Filename, filepath.Ext(file.Filename)))
	uniqueName := fmt.Sprintf("%d_%s_%s.webp", timestamp, uuid.New().String()[:8], base)
	objectPath := "products/" + uniqueName

	if s.useSeaweedFS {
		return s.uploadToSeaweedFS(webpData, objectPath)
	}
	return s.saveLocally(webpData, uniqueName)
}

// uploadToSeaweedFS uploads data to SeaweedFS via S3-compatible API.
// Returns the public URL of the uploaded object.
func (s *ImageService) uploadToSeaweedFS(data []byte, objectPath string) (string, error) {
    client, err := minio.New(s.endpoint, &minio.Options{
        Creds:  credentials.NewStaticV4(s.accessKeyID, s.secretAccessKey, ""),
        Secure: false,
    })
    if err != nil {
        return "", fmt.Errorf("SeaweedFS client error: %w", err)
    }

    ctx := context.Background()

    // Buat bucket jika belum ada
    exists, err := client.BucketExists(ctx, s.bucketName)
    if err != nil {
        return "", fmt.Errorf("bucket check error: %w", err)
    }
    if !exists {
        if err := client.MakeBucket(ctx, s.bucketName, minio.MakeBucketOptions{}); err != nil {
            return "", fmt.Errorf("failed to create bucket: %w", err)
        }
    }

    // Selalu set public policy setiap kali — idempotent, aman dipanggil berulang
    policy := fmt.Sprintf(`{
    "Version":"2012-10-17",
    "Statement":[{
        "Effect":"Allow",
        "Principal":"*",
        "Action":"s3:GetObject",
        "Resource":"arn:aws:s3:::%s/*"
    }]
}`, s.bucketName)

    if err := client.SetBucketPolicy(ctx, s.bucketName, policy); err != nil {
        log.Printf("warning: failed to set bucket policy: %v\n", err)
    }

    // Upload file
    _, err = client.PutObject(ctx, s.bucketName, objectPath, bytes.NewReader(data), int64(len(data)),
        minio.PutObjectOptions{
            ContentType:  "image/webp",
            CacheControl: "public, max-age=31536000",
        },
    )
    if err != nil {
        return "", fmt.Errorf("SeaweedFS upload error: %w", err)
    }

    return fmt.Sprintf("%s/%s/%s", strings.TrimRight(s.publicBaseURL, "/"), s.bucketName, objectPath), nil
}
// CommitImage marks a temp upload as committed in the database
// db should be *gorm.DB instance
func (s *ImageService) CommitImage(db *gorm.DB, imageURL string) error {
	if db == nil {
		return fmt.Errorf("database connection required to commit image")
	}
	return db.Exec("UPDATE upload_temp SET is_committed = true WHERE image_url = ?", imageURL).Error
}

// DeleteFromSeaweedFS removes an object from SeaweedFS given its full public URL.
// Safe to call even if the URL points to local storage (no-op in that case).
func (s *ImageService) DeleteFromSeaweedFS(publicURL string) error {
	if !s.useSeaweedFS {
		return nil
	}

	// Strip base URL prefix to get "<bucket>/<objectPath>"
	prefix := strings.TrimRight(s.publicBaseURL, "/") + "/"
	if !strings.HasPrefix(publicURL, prefix) {
		return nil // not a SeaweedFS URL — skip
	}

	rest := strings.TrimPrefix(publicURL, prefix)
	// rest = "<bucket>/<objectPath>"
	parts := strings.SplitN(rest, "/", 2)
	if len(parts) != 2 {
		return fmt.Errorf("unexpected URL format: %s", publicURL)
	}
	bucket, objectPath := parts[0], parts[1]

	client, err := minio.New(s.endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(s.accessKeyID, s.secretAccessKey, ""),
		Secure: false,
	})
	if err != nil {
		return fmt.Errorf("SeaweedFS client error: %w", err)
	}

	return client.RemoveObject(context.Background(), bucket, objectPath, minio.RemoveObjectOptions{})
}

// saveLocally saves data to disk and returns a URL path (fallback).
func (s *ImageService) saveLocally(data []byte, filename string) (string, error) {
	uploadDir := filepath.Join("uploads", "products")
	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		return "", fmt.Errorf("failed to create upload dir: %w", err)
	}
	fullPath := filepath.Join(uploadDir, filename)
	if err := os.WriteFile(fullPath, data, 0644); err != nil {
		return "", fmt.Errorf("failed to write file: %w", err)
	}
	return "/" + strings.ReplaceAll(fullPath, "\\", "/"), nil
}

// ─────────────────────────────────────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────────────────────────────────────

// HealthCheck verifies connectivity to SeaweedFS S3 endpoint.
func (s *ImageService) HealthCheck() error {
	if !s.useSeaweedFS {
		return nil
	}
	url := fmt.Sprintf("http://%s/", s.endpoint)
	resp, err := http.Get(url)
	if err != nil {
		return fmt.Errorf("SeaweedFS unreachable at %s: %w", s.endpoint, err)
	}
	defer resp.Body.Close()
	return nil
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// SanitizeFilename removes dangerous characters from a filename.
func (s *ImageService) SanitizeFilename(filename string) string {
	filename = filepath.Base(filename)
	r := strings.NewReplacer("\\", "-", "/", "-", ":", "-", "*", "-",
		"?", "-", "\"", "-", "<", "-", ">", "-", "|", "-", " ", "-")
	filename = r.Replace(filename)
	for strings.Contains(filename, "--") {
		filename = strings.ReplaceAll(filename, "--", "-")
	}
	return strings.Trim(filename, "-")
}

// CleanupFile removes a local file (used for rollback on error).
func (s *ImageService) CleanupFile(filePath string) error {
	return os.Remove(filePath)
}