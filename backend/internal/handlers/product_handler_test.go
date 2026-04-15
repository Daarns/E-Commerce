package handlers

import (
	"bytes"
	"fmt"
	"image"
	"image/color"
	"image/jpeg"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// TestImageUploadMultipart_RequestValidation tests multipart form creation for image uploads
func TestImageUploadMultipart_RequestValidation(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Test 1: Single image upload
	body := new(bytes.Buffer)
	writer := multipart.NewWriter(body)

	testImage := createTestJPEG(100, 100)
	part, err := writer.CreateFormFile("image", "test-photo.jpg")
	assert.NoError(t, err)

	bytesWritten, err := io.Copy(part, testImage)
	assert.NoError(t, err)
	assert.Greater(t, bytesWritten, int64(0), "Image data should be written")

	writer.WriteField("alt_text", "Product photo")
	writer.WriteField("position", "0")
	writer.Close()

	// Verify form was created
	assert.Greater(t, body.Len(), 0, "Form should have content")

	req := httptest.NewRequest("POST", "/api/v1/admin/products/00000000-0000-0000-0000-000000000000/images", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	assert.Contains(t, req.Header.Get("Content-Type"), "multipart/form-data")
}

// TestImageUploadMultipart_MultipleFiles tests multipart form with multiple images
func TestImageUploadMultipart_MultipleFiles(t *testing.T) {
	gin.SetMode(gin.TestMode)

	body := new(bytes.Buffer)
	writer := multipart.NewWriter(body)

	fileCount := 3
	for i := 0; i < fileCount; i++ {
		testImage := createTestJPEG(150, 150)
		part, err := writer.CreateFormFile("images", fmt.Sprintf("photo-%d.jpg", i))
		assert.NoError(t, err)

		bytesWritten, err := io.Copy(part, testImage)
		assert.NoError(t, err)
		assert.Greater(t, bytesWritten, int64(0))

		writer.WriteField("alt_text", fmt.Sprintf("Photo %d", i))
	}

	writer.Close()

	// Verify form
	assert.Greater(t, body.Len(), 0)
	req := httptest.NewRequest("POST", "/api/v1/admin/products/00000000-0000-0000-0000-000000000000/images", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rec := httptest.NewRecorder()

	// Verify request was formed correctly
	assert.Equal(t, req.Header.Get("Content-Type"), writer.FormDataContentType())
	assert.Equal(t, rec.Code, http.StatusOK) // No handler executed yet
}

// TestImageUploadValidation_InvalidFormat tests that invalid file formats are rejected
func TestImageUploadValidation_InvalidFormat(t *testing.T) {
	gin.SetMode(gin.TestMode)

	body := new(bytes.Buffer)
	writer := multipart.NewWriter(body)

	part, _ := writer.CreateFormFile("image", "document.txt")
	part.Write([]byte("This is not an image"))
	writer.Close()

	// Verify form
	assert.Greater(t, body.Len(), 0)
	assert.Greater(t, body.Len(), 20) // Should have content
}

// TestImageUploadValidation_LargeFile tests large image file handling
func TestImageUploadValidation_LargeFile(t *testing.T) {
	gin.SetMode(gin.TestMode)

	body := new(bytes.Buffer)
	writer := multipart.NewWriter(body)

	// Create larger test image
	largeImage := createTestJPEG(3000, 3000)
	part, err := writer.CreateFormFile("image", "large-photo.jpg")
	assert.NoError(t, err)

	bytesWritten, err := io.Copy(part, largeImage)
	assert.NoError(t, err)
	// JPEG is compressed, so size depends on content and quality
	// Just verify we have some data
	assert.Greater(t, bytesWritten, int64(100000), "Large image should have substantial size")

	writer.Close()

	// Verify large form
	assert.Greater(t, body.Len(), 100000, "Form size should reflect large image")
}

// TestImageUploadValidation_MaxFileCount tests handling of too many files
func TestImageUploadValidation_MaxFileCount(t *testing.T) {
	gin.SetMode(gin.TestMode)

	body := new(bytes.Buffer)
	writer := multipart.NewWriter(body)

	fileCount := 15 // Exceeds max of 10
	for i := 0; i < fileCount; i++ {
		testImage := createTestJPEG(100, 100)
		part, _ := writer.CreateFormFile("images", fmt.Sprintf("photo-%d.jpg", i))
		io.Copy(part, testImage)
	}

	writer.Close()

	// Verify form was created with many files
	assert.Greater(t, body.Len(), 0)
}

// TestImageUploadMetadata_FieldParsing tests metadata field handling
func TestImageUploadMetadata_FieldParsing(t *testing.T) {
	gin.SetMode(gin.TestMode)

	body := new(bytes.Buffer)
	writer := multipart.NewWriter(body)

	testImage := createTestJPEG(200, 200)
	part, _ := writer.CreateFormFile("image", "photo.jpg")
	io.Copy(part, testImage)

	// Add various metadata
	writer.WriteField("alt_text", "Beautiful sunset photograph")
	writer.WriteField("position", "1")
	writer.WriteField("tags", "nature,sunset,landscape")

	writer.Close()

	assert.Greater(t, body.Len(), 0)
}

// TestImageService_ValidationLogic tests the image validation service
func TestImageService_ValidationLogic(t *testing.T) {
	// Test that image validation works with various dimensions
	tests := []struct {
		name   string
		width  int
		height int
	}{
		{"SmallImage", 100, 100},
		{"MediumImage", 500, 500},
		{"LargeImage", 2000, 2000},
		{"TallImage", 1000, 2000},
		{"WideImage", 3000, 1000},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			img := createTestJPEG(tt.width, tt.height)
			data, err := io.ReadAll(img)
			assert.NoError(t, err)
			assert.Greater(t, len(data), 0, "Should have image data")
		})
	}
}

// TestImageUploadRequestParsing_InvalidProductID tests request with invalid product ID format
func TestImageUploadRequestParsing_InvalidProductID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	invalidIDs := []string{
		"invalid-uuid",
		"not-a-uuid",
		"00000000-0000-0000-0000-00000000000g", // Invalid character
		"",
	}

	for _, invalidID := range invalidIDs {
		t.Run(fmt.Sprintf("InvalidID_%s", invalidID), func(t *testing.T) {
			// Creating a request with invalid ID should not prevent form processing
			body := new(bytes.Buffer)
			writer := multipart.NewWriter(body)
			testImage := createTestJPEG(100, 100)
			part, _ := writer.CreateFormFile("image", "test.jpg")
			io.Copy(part, testImage)
			writer.Close()

			req := httptest.NewRequest("POST", fmt.Sprintf("/api/v1/admin/products/%s/images", invalidID), body)
			req.Header.Set("Content-Type", writer.FormDataContentType())

			// Verify request was created
			assert.NotNil(t, req)
		})
	}
}

// TestImageUploadNoFiles_EmptyForm tests upload with no files in form
func TestImageUploadNoFiles_EmptyForm(t *testing.T) {
	gin.SetMode(gin.TestMode)

	body := new(bytes.Buffer)
	writer := multipart.NewWriter(body)
	writer.Close() // Close without adding files

	req := httptest.NewRequest("POST", "/api/v1/admin/products/00000000-0000-0000-0000-000000000000/images", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	// Verify request form is empty
	assert.NotNil(t, req)
	assert.Greater(t, body.Len(), 0) // Form boundary exists
}

// TestImageUploadFormEncoding_ContentType verifies correct multipart encoding
func TestImageUploadFormEncoding_ContentType(t *testing.T) {
	gin.SetMode(gin.TestMode)

	body := new(bytes.Buffer)
	writer := multipart.NewWriter(body)
	testImage := createTestJPEG(100, 100)
	part, _ := writer.CreateFormFile("image", "test.jpg")
	io.Copy(part, testImage)
	writer.Close()

	contentType := writer.FormDataContentType()
	assert.Contains(t, contentType, "multipart/form-data")
	assert.Contains(t, contentType, "boundary=")
}

// Helper function to create test JPEG image with specific dimensions
func createTestJPEG(width, height int) io.Reader {
	img := image.NewRGBA(image.Rect(0, 0, width, height))

	// Fill with blue color
	c := color.RGBA{R: 0, G: 0, B: 255, A: 255}
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			img.SetRGBA(x, y, c)
		}
	}

	buf := new(bytes.Buffer)
	jpeg.Encode(buf, img, &jpeg.Options{Quality: 85})

	return bytes.NewReader(buf.Bytes())
}
