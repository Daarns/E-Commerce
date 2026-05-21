package repositories

import (
	"ecommerce-backend/internal/models"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CategoryRepository handles category data operations
type CategoryRepository struct {
	db *gorm.DB
}

type CategoryListFilter struct {
	Status string
	Page   int
	Limit  int
}

type CategoryStats struct {
	Total    int64 `json:"total"`
	Active   int64 `json:"active"`
	Inactive int64 `json:"inactive"`
	Root     int64 `json:"root"`
}

type CategoryListResult struct {
	Categories []models.Category `json:"categories"`
	Total      int64             `json:"total"`
	Page       int               `json:"page"`
	Limit      int               `json:"limit"`
	TotalPages int               `json:"total_pages"`
	Stats      CategoryStats     `json:"stats"`
}

// NewCategoryRepository creates a new category repository
func NewCategoryRepository(db *gorm.DB) *CategoryRepository {
	return &CategoryRepository{db: db}
}

// Create creates a new category
func (r *CategoryRepository) Create(category *models.Category) error {
	// Generate unique slug if exists
	if category.Slug == "" {
		category.Slug = models.GenerateSlug(category.Name)
	}

	// Check for slug conflict
	existingSlugs, err := r.GetAllSlugs()
	if err != nil {
		return fmt.Errorf("failed to check existing slugs: %w", err)
	}
	category.Slug = models.GenerateUniqueSlug(category.Slug, existingSlugs)

	return r.db.Create(category).Error
}

// GetByID retrieves a category by ID
func (r *CategoryRepository) GetByID(id uuid.UUID) (*models.Category, error) {
	var category models.Category
	err := r.db.First(&category, "id = ?", id).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("category not found")
		}
		return nil, err
	}
	return &category, nil
}

// GetBySlug retrieves a category by slug
func (r *CategoryRepository) GetBySlug(slug string) (*models.Category, error) {
	var category models.Category
	err := r.db.First(&category, "slug = ?", slug).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("category not found")
		}
		return nil, err
	}
	return &category, nil
}

// GetAll retrieves all active categories
func (r *CategoryRepository) GetAll() ([]models.Category, error) {
	var categories []models.Category
	err := r.db.Where("is_active = ?", true).Order("name ASC").Find(&categories).Error
	return categories, err
}

func (r *CategoryRepository) ListAdmin(filter CategoryListFilter) (*CategoryListResult, error) {
	page := filter.Page
	if page < 1 {
		page = 1
	}
	limit := filter.Limit
	if limit < 1 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}

	query := r.db.Model(&models.Category{})
	switch filter.Status {
	case "active":
		query = query.Where("is_active = ?", true)
	case "inactive":
		query = query.Where("is_active = ?", false)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	var categories []models.Category
	if err := query.
		Order("parent_id NULLS FIRST").
		Order("name ASC").
		Offset((page - 1) * limit).
		Limit(limit).
		Find(&categories).Error; err != nil {
		return nil, err
	}

	stats, err := r.GetAdminStats()
	if err != nil {
		return nil, err
	}

	totalPages := 0
	if total > 0 {
		totalPages = int((total + int64(limit) - 1) / int64(limit))
	}

	return &CategoryListResult{
		Categories: categories,
		Total:      total,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
		Stats:      stats,
	}, nil
}

func (r *CategoryRepository) GetAdminStats() (CategoryStats, error) {
	var stats CategoryStats

	if err := r.db.Model(&models.Category{}).Count(&stats.Total).Error; err != nil {
		return stats, err
	}
	if err := r.db.Model(&models.Category{}).Where("is_active = ?", true).Count(&stats.Active).Error; err != nil {
		return stats, err
	}
	if err := r.db.Model(&models.Category{}).Where("is_active = ?", false).Count(&stats.Inactive).Error; err != nil {
		return stats, err
	}
	if err := r.db.Model(&models.Category{}).Where("parent_id IS NULL").Count(&stats.Root).Error; err != nil {
		return stats, err
	}

	return stats, nil
}

// GetRootCategories retrieves all root categories (no parent)
func (r *CategoryRepository) GetRootCategories() ([]models.Category, error) {
	var categories []models.Category
	err := r.db.Where("parent_id IS NULL AND is_active = ?", true).Order("name ASC").Find(&categories).Error
	return categories, err
}

// GetChildren retrieves child categories of a parent
func (r *CategoryRepository) GetChildren(parentID uuid.UUID) ([]models.Category, error) {
	var categories []models.Category
	err := r.db.Where("parent_id = ? AND is_active = ?", parentID, true).Order("name ASC").Find(&categories).Error
	return categories, err
}

// GetWithChildren retrieves a category with its children
func (r *CategoryRepository) GetWithChildren(id uuid.UUID) (*models.Category, []models.Category, error) {
	category, err := r.GetByID(id)
	if err != nil {
		return nil, nil, err
	}

	children, err := r.GetChildren(id)
	if err != nil {
		return nil, nil, err
	}

	return category, children, nil
}

// Update updates a category
func (r *CategoryRepository) Update(category *models.Category) error {
	return r.db.Save(category).Error
}

// Delete soft deletes a category
func (r *CategoryRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&models.Category{}, "id = ?", id).Error
}

// GetAllSlugs retrieves all category slugs
func (r *CategoryRepository) GetAllSlugs() ([]string, error) {
	var slugs []string
	err := r.db.Model(&models.Category{}).Pluck("slug", &slugs).Error
	return slugs, err
}

// SlugExists checks if a slug already exists
func (r *CategoryRepository) SlugExists(slug string) (bool, error) {
	var count int64
	err := r.db.Model(&models.Category{}).Where("slug = ?", slug).Count(&count).Error
	return count > 0, err
}

// GetCategoryTree builds a hierarchical category tree
func (r *CategoryRepository) GetCategoryTree() ([]CategoryTreeNode, error) {
	var categories []models.Category
	err := r.db.Where("is_active = ?", true).Order("name ASC").Find(&categories).Error
	if err != nil {
		return nil, err
	}

	return buildCategoryTree(categories, nil), nil
}

// CategoryTreeNode represents a category with nested children
type CategoryTreeNode struct {
	Category models.Category    `json:"category"`
	Children []CategoryTreeNode `json:"children,omitempty"`
}

// buildCategoryTree recursively builds category tree
func buildCategoryTree(categories []models.Category, parentID *uuid.UUID) []CategoryTreeNode {
	var tree []CategoryTreeNode

	for _, cat := range categories {
		// Check if this category belongs to current parent
		if (parentID == nil && cat.ParentID == nil) ||
			(parentID != nil && cat.ParentID != nil && *cat.ParentID == *parentID) {
			node := CategoryTreeNode{
				Category: cat,
				Children: buildCategoryTree(categories, &cat.ID),
			}
			tree = append(tree, node)
		}
	}

	return tree
}
