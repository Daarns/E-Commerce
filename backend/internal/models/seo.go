package models

import (
	"regexp"
)

// GenerateMetaTitle creates a standard meta title
func GenerateMetaTitle(p *Product) string {
	title := p.Name
	if p.Brand != "" {
		title += " " + p.Brand
	}
	title += " | Daarn Store" // Assuming a default store name, user can customize
	if len(title) > 60 {
		return title[:57] + "..."
	}
	return title
}

// GenerateMetaDescription creates a meta description by stripping HTML
func GenerateMetaDescription(p *Product) string {
	// Strip HTML tags
	re := regexp.MustCompile(`<[^>]*>`)
	plain := re.ReplaceAllString(p.ShortDescription, "")
	if plain == "" {
		plain = re.ReplaceAllString(p.Description, "")
	}
	if len(plain) > 157 {
		return plain[:157] + "..."
	}
	return plain
}

// GenerateCanonicalURL creates the standard URL for the product
func GenerateCanonicalURL(slug string) string {
	// TODO: UBAH KE URL PRODUCTION JIKA SUDAH DEPLOY (contoh: https://namadomain.com)
	// Saat ini menggunakan localhost untuk development
	return "http://localhost:3000/products/" + slug
}

// GetPrimaryImageURL finds the primary image or returns the first one
func GetPrimaryImageURL(images []ProductImage) string {
	for _, img := range images {
		if img.IsPrimary {
			return img.ImageURL
		}
	}
	if len(images) > 0 {
		return images[0].ImageURL
	}
	return ""
}
