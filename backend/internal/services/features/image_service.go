package features

import (
	"bytes"
	"fmt"
	"image"
	"image/jpeg"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
)

// ImageService handles image operations including optimization and uploads
type ImageService struct {
	bucketName string
	useGCS     bool
}

// ImageUploadResult represents the result of an image upload
type ImageUploadResult struct {
	ID           uuid.UUID `json:"id"`
	URL          string    `json:"url"`
	AltText      string    `json:"alt_text"`
	IsPrimary    bool      `json:"is_primary"`
	DisplayOrder int       `json:"display_order"`
}

// NewImageService creates a new image service
func NewImageService(bucketName string) *ImageService {
	return &ImageService{
		bucketName: bucketName,
		useGCS:     false, // Will be enabled when GCS is properly configured
	}
}

// ValidateImageFiles validates multiple image files
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

// validateSingleFile validates a single image file
func (s *ImageService) validateSingleFile(file *multipart.FileHeader, index int) error {
	// Validate file size (max 10MB)
	const maxSize = 10 * 1024 * 1024
	if file.Size > maxSize {
		return fmt.Errorf("image[%d]: file size exceeds maximum allowed (10MB)", index)
	}

	if file.Size < 1024 { // At least 1KB
		return fmt.Errorf("image[%d]: file is too small (minimum 1KB)", index)
	}

	// Validate file extension
	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowedExts := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".webp": true,
		".gif":  true,
	}

	if !allowedExts[ext] {
		return fmt.Errorf("image[%d]: file type not allowed. Allowed types: jpg, jpeg, png, webp, gif", index)
	}

	// Validate MIME type by opening file
	if opened, err := file.Open(); err == nil {
		defer opened.Close()
		if err := s.validateMimeType(opened); err != nil {
			return fmt.Errorf("image[%d]: %v", index, err)
		}
	}

	return nil
}

// validateMimeType validates the MIME type of an image
func (s *ImageService) validateMimeType(file io.Reader) error {
	// Read first 512 bytes for type detection
	header := make([]byte, 512)
	n, err := file.Read(header)
	if err != nil && err != io.EOF {
		return fmt.Errorf("failed to read file header: %w", err)
	}

	// Try to decode as image to verify it's actually an image
	_, format, err := image.DecodeConfig(bytes.NewReader(header[:n]))
	if err != nil {
		return fmt.Errorf("invalid image format: %w", err)
	}

	// Whitelist allowed formats
	allowedFormats := map[string]bool{
		"jpeg": true,
		"png":  true,
		"gif":  true,
		"webp": true,
	}

	if !allowedFormats[format] {
		return fmt.Errorf("unsupported image format: %s", format)
	}

	return nil
}

// OptimizeImage optimizes an image by resizing and compressing
func (s *ImageService) OptimizeImage(file *multipart.FileHeader, maxWidth, maxHeight int) ([]byte, string, error) {
	opened, err := file.Open()
	if err != nil {
		return nil, "", fmt.Errorf("failed to open file: %w", err)
	}
	defer opened.Close()

	// Read file data
	data, err := io.ReadAll(opened)
	if err != nil {
		return nil, "", fmt.Errorf("failed to read file: %w", err)
	}

	// Decode image to get format
	_, format, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		return nil, "", fmt.Errorf("failed to decode image: %w", err)
	}

	// For JPEG, apply compression
	if strings.ToLower(format) == "jpeg" {
		optimized, err := s.compressJPEG(data)
		if err != nil {
			return nil, format, fmt.Errorf("failed to compress JPEG: %w", err)
		}
		return optimized, format, nil
	}

	// For other formats, return as-is for now
	return data, format, nil
}

// compressJPEG re-encodes JPEG with lower quality for compression
func (s *ImageService) compressJPEG(data []byte) ([]byte, error) {
	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("failed to decode JPEG: %w", err)
	}

	var buf bytes.Buffer
	err = jpeg.Encode(&buf, img, &jpeg.Options{Quality: 85})
	if err != nil {
		return nil, fmt.Errorf("failed to encode JPEG: %w", err)
	}

	return buf.Bytes(), nil
}

// SaveImageToStorage saves optimized image to local storage
// In production, this would upload to GCS
func (s *ImageService) SaveImageToStorage(imageData []byte, filename string) (string, error) {
	// Generate unique filename
	timestamp := time.Now().Unix()
	sanitized := s.SanitizeFilename(filename)
	uniqueFilename := fmt.Sprintf("%d_%s", timestamp, sanitized)
	
	// Create directory structure
	uploadDir := filepath.Join("uploads", "products")
	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		return "", fmt.Errorf("failed to create upload directory: %w", err)
	}

	// Full file path
	fullPath := filepath.Join(uploadDir, uniqueFilename)

	// Write file to disk
	if err := os.WriteFile(fullPath, imageData, 0644); err != nil {
		return "", fmt.Errorf("failed to save image file: %w", err)
	}

	// Return URL path (would be served by web server)
	return "/" + fullPath, nil
}

// SanitizeFilename removes potentially dangerous characters from filename
func (s *ImageService) SanitizeFilename(filename string) string {
	// Remove path separators
	filename = filepath.Base(filename)

	// Remove special characters
	replacer := strings.NewReplacer(
		"\\", "-",
		"/", "-",
		":", "-",
		"*", "-",
		"?", "-",
		"\"", "-",
		"<", "-",
		">", "-",
		"|", "-",
		" ", "-",
	)
	filename = replacer.Replace(filename)

	// Remove multiple consecutive dashes
	for strings.Contains(filename, "--") {
		filename = strings.ReplaceAll(filename, "--", "-")
	}

	// Trim dashes from edges
	filename = strings.Trim(filename, "-")

	return filename
}

// CleanupFile removes a file from storage (for error rollback)
func (s *ImageService) CleanupFile(filePath string) error {
	return os.Remove(filePath)
}

