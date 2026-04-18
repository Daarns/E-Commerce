package features

import (
	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"
	"fmt"
	"time"
)

// ProductRepository interface for dependency injection
type ProductRepository interface {
	GetFeaturedProducts(limit int) ([]models.Product, error)
	GetBestSellers(limit int) ([]models.Product, error)
	GetNewArrivals(limit int) ([]models.Product, error)
}

// CategoryRepository interface for dependency injection
type CategoryRepository interface {
	GetCategoryTree() ([]repositories.CategoryTreeNode, error)
}

// DiscoveryService handles homepage discovery features
type DiscoveryService struct {
	productRepo   ProductRepository
	categoryRepo  CategoryRepository
	cacheService  *CacheService
}

// NewDiscoveryService creates a new discovery service
func NewDiscoveryService(
	productRepo ProductRepository,
	categoryRepo CategoryRepository,
	cacheService *CacheService,
) *DiscoveryService {
	return &DiscoveryService{
		productRepo:  productRepo,
		categoryRepo: categoryRepo,
		cacheService: cacheService,
	}
}

// FeaturedProductsResponse represents featured products API response
type FeaturedProductsResponse struct {
	Products []ProductSummary `json:"products"`
}

// BestSellersResponse represents best sellers API response
type BestSellersResponse struct {
	Bestsellers []ProductSummary `json:"bestsellers"`
}

// NewArrivalsResponse represents new arrivals API response
type NewArrivalsResponse struct {
	NewArrivals []ProductSummary `json:"new_arrivals"`
}

// ProductSummary is a lightweight product representation
type ProductSummary struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Slug         string `json:"slug"`
	Image        string `json:"image,omitempty"`
	Price        string `json:"price"`
	SalePrice    *string `json:"sale_price,omitempty"`
	RatingAvg    float64 `json:"rating_average"`
	SoldCount    int `json:"sold_count,omitempty"`
}

// CategorySummary is a lightweight category representation
type CategorySummary struct {
	ID            string            `json:"id"`
	Name          string            `json:"name"`
	Slug          string            `json:"slug"`
	Image         string            `json:"image,omitempty"`
	ProductCount  int64             `json:"product_count"`
	Children      []CategorySummary `json:"children,omitempty"`
}

// GetFeaturedProducts retrieves featured products with caching
func (s *DiscoveryService) GetFeaturedProducts(limit int) (*FeaturedProductsResponse, error) {
	if limit <= 0 {
		limit = 8
	}
	if limit > 20 {
		limit = 20
	}

	// Try cache first
	cacheKey := fmt.Sprintf("featured:%d", limit)
	if cached, err := s.cacheService.Get(cacheKey); err == nil && cached != nil {
		return cached.(*FeaturedProductsResponse), nil
	}

	// Fetch from database
	products, err := s.productRepo.GetFeaturedProducts(limit)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch featured products: %w", err)
	}

	response := &FeaturedProductsResponse{
		Products: make([]ProductSummary, len(products)),
	}

	for i, p := range products {
		response.Products[i] = s.productToSummary(p)
	}

	// Cache for 5 minutes
	s.cacheService.Set(cacheKey, response, 5*time.Minute)

	return response, nil
}

// GetBestSellers retrieves best selling products with caching
func (s *DiscoveryService) GetBestSellers(limit int) (*BestSellersResponse, error) {
	if limit <= 0 {
		limit = 8
	}
	if limit > 20 {
		limit = 20
	}

	// Try cache first
	cacheKey := fmt.Sprintf("bestsellers:%d", limit)
	if cached, err := s.cacheService.Get(cacheKey); err == nil && cached != nil {
		return cached.(*BestSellersResponse), nil
	}

	// Fetch from database
	products, err := s.productRepo.GetBestSellers(limit)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch best sellers: %w", err)
	}

	response := &BestSellersResponse{
		Bestsellers: make([]ProductSummary, len(products)),
	}

	for i, p := range products {
		summary := s.productToSummary(p)
		summary.SoldCount = p.SoldCount
		response.Bestsellers[i] = summary
	}

	// Cache for 5 minutes
	s.cacheService.Set(cacheKey, response, 5*time.Minute)

	return response, nil
}

// GetNewArrivals retrieves recent products with caching
func (s *DiscoveryService) GetNewArrivals(limit int) (*NewArrivalsResponse, error) {
	if limit <= 0 {
		limit = 8
	}
	if limit > 20 {
		limit = 20
	}

	// Try cache first
	cacheKey := fmt.Sprintf("newarrivals:%d", limit)
	if cached, err := s.cacheService.Get(cacheKey); err == nil && cached != nil {
		return cached.(*NewArrivalsResponse), nil
	}

	// Fetch from database
	products, err := s.productRepo.GetNewArrivals(limit)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch new arrivals: %w", err)
	}

	response := &NewArrivalsResponse{
		NewArrivals: make([]ProductSummary, len(products)),
	}

	for i, p := range products {
		response.NewArrivals[i] = s.productToSummary(p)
	}

	// Cache for 5 minutes
	s.cacheService.Set(cacheKey, response, 5*time.Minute)

	return response, nil
}

// GetCategoryHierarchy retrieves categories with hierarchy (no caching as admin updates)
func (s *DiscoveryService) GetCategoryHierarchy() ([]CategorySummary, error) {
	tree, err := s.categoryRepo.GetCategoryTree()
	if err != nil {
		return nil, fmt.Errorf("failed to fetch categories: %w", err)
	}

	categories := make([]CategorySummary, len(tree))
	for i, node := range tree {
		categories[i] = s.categoryTreeToSummary(node)
	}

	return categories, nil
}

// productToSummary converts a product to a summary for API responses
func (s *DiscoveryService) productToSummary(p models.Product) ProductSummary {
	image := ""
	if len(p.Images) > 0 {
		image = p.Images[0].ImageURL
	}

	summary := ProductSummary{
		ID:        p.ID.String(),
		Name:      p.Name,
		Slug:      p.Slug,
		Image:     image,
		Price:     p.RegularPrice.String(),
		RatingAvg: 0, // TODO: Join with reviews table for ratings
	}

	// Include sale price if available
	if p.SalePrice != nil {
		salePrice := p.SalePrice.String()
		summary.SalePrice = &salePrice
	}

	return summary
}

// categoryTreeToSummary converts category tree node to summary
func (s *DiscoveryService) categoryTreeToSummary(node repositories.CategoryTreeNode) CategorySummary {
	image := node.Category.ImageURL

	summary := CategorySummary{
		ID:           node.Category.ID.String(),
		Name:         node.Category.Name,
		Slug:         node.Category.Slug,
		Image:        image,
		ProductCount: 0, // TODO: Count products in category
	}

	if len(node.Children) > 0 {
		summary.Children = make([]CategorySummary, len(node.Children))
		for i, child := range node.Children {
			summary.Children[i] = s.categoryTreeToSummary(child)
		}
	}

	return summary
}

// InvalidateFeaturedCache clears featured products cache (called on product update)
func (s *DiscoveryService) InvalidateFeaturedCache() {
	for limit := 1; limit <= 20; limit++ {
		cacheKey := fmt.Sprintf("featured:%d", limit)
		s.cacheService.Delete(cacheKey)
	}
}

// InvalidateBestsellersCache clears bestsellers cache (called on order completion)
func (s *DiscoveryService) InvalidateBestsellersCache() {
	for limit := 1; limit <= 20; limit++ {
		cacheKey := fmt.Sprintf("bestsellers:%d", limit)
		s.cacheService.Delete(cacheKey)
	}
}

// InvalidateNewArrivalsCache clears new arrivals cache (called on product creation)
func (s *DiscoveryService) InvalidateNewArrivalsCache() {
	for limit := 1; limit <= 20; limit++ {
		cacheKey := fmt.Sprintf("newarrivals:%d", limit)
		s.cacheService.Delete(cacheKey)
	}
}

