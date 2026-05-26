package product

import (
	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/google/uuid"
)

// CategoryService handles category business logic
type CategoryService struct {
	categoryRepo *repositories.CategoryRepository
	productRepo  *repositories.ProductRepository
}

// NewCategoryService creates a new category service
func NewCategoryService(categoryRepo *repositories.CategoryRepository, productRepo *repositories.ProductRepository) *CategoryService {
	return &CategoryService{
		categoryRepo: categoryRepo,
		productRepo:  productRepo,
	}
}

// CreateCategoryInput represents category creation input
type CreateCategoryInput struct {
	Name        string     `json:"name" binding:"required,min=2,max=100"`
	Description string     `json:"description"`
	ParentID    *uuid.UUID `json:"parent_id"`
	ImageURL    string     `json:"image_url"`
	IsActive    bool       `json:"is_active"`
}

// UpdateCategoryInput represents category update input
type UpdateCategoryInput struct {
	Name        *string        `json:"name,omitempty"`
	Description *string        `json:"description,omitempty"`
	ParentID    OptionalString `json:"parent_id,omitempty"`
	ImageURL    *string        `json:"image_url,omitempty"`
	IsActive    *bool          `json:"is_active,omitempty"`
}

// OptionalString distinguishes an omitted JSON field from an explicit null.
// This is needed for PATCH-like updates where parent_id:null means "clear parent",
// while an omitted parent_id means "keep the current parent".
type OptionalString struct {
	Set   bool
	Value *string
}

func (o *OptionalString) UnmarshalJSON(data []byte) error {
	o.Set = true
	if string(data) == "null" {
		o.Value = nil
		return nil
	}

	var value string
	if err := json.Unmarshal(data, &value); err != nil {
		return err
	}
	o.Value = &value
	return nil
}

// CreateCategory creates a new category
func (uc *CategoryService) CreateCategory(input CreateCategoryInput) (*models.Category, error) {
	// Validate parent exists if provided
	if input.ParentID != nil {
		_, err := uc.categoryRepo.GetByID(*input.ParentID)
		if err != nil {
			return nil, fmt.Errorf("invalid parent category: %w", err)
		}
	}

	category := &models.Category{
		Name:        strings.TrimSpace(input.Name),
		Description: strings.TrimSpace(input.Description),
		ParentID:    input.ParentID,
		ImageURL:    input.ImageURL,
		IsActive:    input.IsActive,
	}

	if err := uc.categoryRepo.Create(category); err != nil {
		return nil, fmt.Errorf("failed to create category: %w", err)
	}

	return category, nil
}

// GetCategory retrieves a category by ID
func (uc *CategoryService) GetCategory(id uuid.UUID) (*models.Category, error) {
	return uc.categoryRepo.GetByID(id)
}

// GetCategoryBySlug retrieves a category by slug
func (uc *CategoryService) GetCategoryBySlug(slug string) (*models.Category, error) {
	return uc.categoryRepo.GetBySlug(slug)
}

// ListCategories retrieves all categories
func (uc *CategoryService) ListCategories() ([]models.Category, error) {
	return uc.categoryRepo.GetAll()
}

func (uc *CategoryService) ListAdminCategories(filter repositories.CategoryListFilter) (*repositories.CategoryListResult, error) {
	return uc.categoryRepo.ListAdmin(filter)
}

// GetRootCategories retrieves root categories
func (uc *CategoryService) GetRootCategories() ([]models.Category, error) {
	return uc.categoryRepo.GetRootCategories()
}

// GetCategoryTree retrieves hierarchical category tree
func (uc *CategoryService) GetCategoryTree() ([]repositories.CategoryTreeNode, error) {
	return uc.categoryRepo.GetCategoryTree()
}

// GetCategoryWithChildren retrieves a category with its children
func (uc *CategoryService) GetCategoryWithChildren(id uuid.UUID) (*models.Category, []models.Category, error) {
	return uc.categoryRepo.GetWithChildren(id)
}

// UpdateCategory updates a category
func (uc *CategoryService) UpdateCategory(id uuid.UUID, input UpdateCategoryInput) (*models.Category, error) {
	category, err := uc.categoryRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	if input.Name != nil {
		category.Name = strings.TrimSpace(*input.Name)
		// Regenerate slug
		category.Slug = models.GenerateSlug(category.Name)
		existingSlugs, err := uc.categoryRepo.GetAllSlugsExcept(id)
		if err != nil {
			return nil, fmt.Errorf("failed to check existing category slugs: %w", err)
		}
		category.Slug = models.GenerateUniqueSlug(category.Slug, existingSlugs)
	}

	if input.Description != nil {
		category.Description = strings.TrimSpace(*input.Description)
	}

	if input.ParentID.Set {
		parentID := ""
		if input.ParentID.Value != nil {
			parentID = strings.TrimSpace(*input.ParentID.Value)
		}
		if parentID == "" {
			category.ParentID = nil
		} else {
			parsedParentID, parseErr := uuid.Parse(parentID)
			if parseErr != nil {
				return nil, fmt.Errorf("invalid parent category id")
			}
			if parsedParentID == id {
				return nil, fmt.Errorf("category cannot be its own parent")
			}
			if _, err := uc.categoryRepo.GetByID(parsedParentID); err != nil {
				return nil, fmt.Errorf("invalid parent category: %w", err)
			}
			category.ParentID = &parsedParentID
		}
	}

	if input.ImageURL != nil {
		category.ImageURL = *input.ImageURL
	}

	if input.IsActive != nil {
		category.IsActive = *input.IsActive
	}

	if err := uc.categoryRepo.Update(category); err != nil {
		return nil, fmt.Errorf("failed to update category: %w", err)
	}

	return category, nil
}

// DeleteCategory soft deletes a category
func (uc *CategoryService) DeleteCategory(id uuid.UUID) error {
	// Check if category has products
	filter := repositories.ProductFilter{
		CategoryID: &id,
	}
	result, err := uc.productRepo.List(filter)
	if err != nil {
		return err
	}

	if result.Total > 0 {
		return fmt.Errorf("cannot delete category with %d products", result.Total)
	}

	return uc.categoryRepo.Delete(id)
}
