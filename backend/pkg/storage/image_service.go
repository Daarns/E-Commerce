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
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"cloud.google.com/go/storage"
	webpEncoder "github.com/chai2010/webp"
	"github.com/google/uuid"
	"google.golang.org/api/option"
)

// ImageService handles image operations including optimization and uploads.
type ImageService struct {
	bucketName     string
	projectID      string
	credentialFile string   // path to service-account JSON key
	useGCS         bool
}

// ImageUploadResult represents the result of an image upload.
type ImageUploadResult struct {
	ID           uuid.UUID `json:"id"`
	URL          string    `json:"url"`
	AltText      string    `json:"alt_text"`
	IsPrimary    bool      `json:"is_primary"`
	DisplayOrder int       `json:"display_order"`
}

// NewImageService creates an ImageService.
// bucketName and projectID come from environment variables.
// credentialFile is the path to a GCS service-account JSON key.
// If credentialFile is empty or missing, falls back to local storage.
func NewImageService(bucketName, projectID, credentialFile string) *ImageService {
	useGCS := bucketName != "" && projectID != "" && credentialFile != ""
	if useGCS {
		if _, err := os.Stat(credentialFile); os.IsNotExist(err) {
			useGCS = false
		}
	}
	return &ImageService{
		bucketName:     bucketName,
		projectID:      projectID,
		credentialFile: credentialFile,
		useGCS:         useGCS,
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
	// which will cause DecodeConfig to fail if truncated.
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
	// Convert to WebP first (quality 85 is a good balance)
	webpData, err := s.ConvertToWebP(file, 85)
	if err != nil {
		return "", fmt.Errorf("image conversion failed: %w", err)
	}

	// Build unique filename
	timestamp := time.Now().Unix()
	base := s.SanitizeFilename(strings.TrimSuffix(file.Filename, filepath.Ext(file.Filename)))
	uniqueName := fmt.Sprintf("%d_%s_%s.webp", timestamp, uuid.New().String()[:8], base)

	if s.useGCS {
		return s.uploadToGCS(webpData, "products/"+uniqueName)
	}
	return s.saveLocally(webpData, uniqueName)
}

// uploadToGCS uploads data to Google Cloud Storage and returns the public URL.
func (s *ImageService) uploadToGCS(data []byte, objectPath string) (string, error) {
	ctx := context.Background()

	client, err := storage.NewClient(ctx, option.WithCredentialsFile(s.credentialFile))
	if err != nil {
		return "", fmt.Errorf("GCS client error: %w", err)
	}
	defer client.Close()

	obj := client.Bucket(s.bucketName).Object(objectPath)
	wc := obj.NewWriter(ctx)
	wc.ContentType = "image/webp"
	wc.CacheControl = "public, max-age=31536000" // 1 year CDN cache

	if _, err := wc.Write(data); err != nil {
		return "", fmt.Errorf("GCS write error: %w", err)
	}
	if err := wc.Close(); err != nil {
		return "", fmt.Errorf("GCS close error: %w", err)
	}

	// Make object publicly readable
	if err := obj.ACL().Set(ctx, storage.AllUsers, storage.RoleReader); err != nil {
		// Non-fatal: object is uploaded, ACL may already be set at bucket level
		fmt.Printf("warning: failed to set GCS public ACL: %v\n", err)
	}

	return fmt.Sprintf("https://storage.googleapis.com/%s/%s", s.bucketName, objectPath), nil
}

// saveLocally saves data to disk and returns a URL path.
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
