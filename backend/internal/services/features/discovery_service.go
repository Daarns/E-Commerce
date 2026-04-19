package features

import (
	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"
	"ecommerce-backend/internal/services/cache"
	"fmt"
	"time"
)

// ProductRepository interface for dependency injection
type ProductRepository interface {
	GetFeaturedProducts(limit int) ([]models.Product, error)
	GetBestSellers(limit int) ([]models.Product, error)
	GetNewArrivals(limit int) ([]models.Product, error)
	GetCandidatesForFeatured() ([]models.Product, error)
}

// CategoryRepository interface for dependency injection
type CategoryRepository interface {
	GetCategoryTree() ([]repositories.CategoryTreeNode, error)
}

// DiscoveryService handles homepage discovery features
type DiscoveryService struct {
	productRepo   ProductRepository
	categoryRepo  CategoryRepository
	cacheService  *cache.CacheService
}

// NewDiscoveryService creates a new discovery service
func NewDiscoveryService(
	productRepo ProductRepository,
	categoryRepo CategoryRepository,
	cacheService *cache.CacheService,
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

// GetFeaturedProducts retrieves featured products with balanced scoring and diversity
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

	// Fetch candidates
	products, err := s.productRepo.GetCandidatesForFeatured()
	if err != nil {
		return nil, fmt.Errorf("failed to fetch featured products: %w", err)
	}

	// Calculate scores and apply diversity rules
	featured := s.applyDiversityRules(products, limit)

	response := &FeaturedProductsResponse{
		Products: make([]ProductSummary, len(featured)),
	}

	for i, p := range featured {
		response.Products[i] = s.productToSummary(p)
	}

	// Cache for 24 hours
	s.cacheService.Set(cacheKey, response, 24*time.Hour)

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

// ProductScore represents a product with its calculated score
type ProductScore struct {
	Product models.Product
	Score   float64
}

// calculateFeaturedScore calculates a weighted score based on multiple criteria
// Weights: 30% sold_count, 25% rating, 20% trending(views), 15% stock_alert, 10% new_product
func (s *DiscoveryService) calculateFeaturedScore(p models.Product) float64 {
	var score float64 = 0.0

	// Normalize sold_count (assume max 1000 as baseline)
	maxSoldCount := 1000.0
	soldCountScore := float64(p.SoldCount) / maxSoldCount
	if soldCountScore > 1.0 {
		soldCountScore = 1.0
	}
	score += soldCountScore * 30.0

	// Normalize rating (max 5.0)
	ratingScore := p.AvgRating / 5.0
	if ratingScore > 1.0 {
		ratingScore = 1.0
	}
	score += ratingScore * 25.0

	// Normalize view count (assume max 10000 as baseline)
	maxViewCount := 10000.0
	viewCountScore := float64(p.ViewCount) / maxViewCount
	if viewCountScore > 1.0 {
		viewCountScore = 1.0
	}
	score += viewCountScore * 20.0

	// Stock alert bonus: if stock < threshold, add urgency bonus
	stockAlertBonus := 0.0
	if p.StockQuantity < p.StockAlertThreshold && p.StockQuantity > 0 {
		// Product is low stock - bonus for urgency
		stockAlertBonus = 1.0 - (float64(p.StockQuantity) / float64(p.StockAlertThreshold))
	}
	score += stockAlertBonus * 15.0

	// New product bonus: if created within 30 days
	newProductBonus := 0.0
	daysSinceCreation := time.Since(p.CreatedAt).Hours() / 24
	if daysSinceCreation <= 30 {
		newProductBonus = 1.0 - (daysSinceCreation / 30.0)
	}
	score += newProductBonus * 10.0

	return score
}

// applyDiversityRules filters and orders products to ensure balanced variety
// - Mix of best sellers, top-rated, and trending
// - Limit same category to max 3 items
// - Ensure at least 1 top-rated per 3 items
// - Ensure at least 1 trending per 4 items
func (s *DiscoveryService) applyDiversityRules(products []models.Product, limit int) []models.Product {
	if len(products) == 0 {
		return products
	}

	// Calculate scores for all products
	productScores := make([]ProductScore, len(products))
	for i, p := range products {
		productScores[i] = ProductScore{
			Product: p,
			Score:   s.calculateFeaturedScore(p),
		}
	}

	// Sort by score descending
	for i := 0; i < len(productScores)-1; i++ {
		for j := i + 1; j < len(productScores); j++ {
			if productScores[j].Score > productScores[i].Score {
				productScores[i], productScores[j] = productScores[j], productScores[i]
			}
		}
	}

	// Apply diversity rules
	result := []models.Product{}
	categoryCount := make(map[string]int) // Count per category (by category ID)
	topRatedCount := 0
	trendingCount := 0

	for _, ps := range productScores {
		if len(result) >= limit {
			break
		}

		// Check category limit: max 3 items per category
		catID := ps.Product.CategoryID.String()
		if categoryCount[catID] >= 3 {
			continue
		}

		// Check if we need more top-rated (min 1 per 3 items)
		if topRatedCount < (len(result)+1)/3 && ps.Product.AvgRating >= 4.0 {
			result = append(result, ps.Product)
			categoryCount[catID]++
			topRatedCount++
			continue
		}

		// Check if we need more trending (min 1 per 4 items)
		if trendingCount < (len(result)+1)/4 && ps.Product.ViewCount >= 100 {
			result = append(result, ps.Product)
			categoryCount[catID]++
			trendingCount++
			continue
		}

		// Default: add product if it fits category limit
		result = append(result, ps.Product)
		categoryCount[catID]++

		if ps.Product.AvgRating >= 4.0 {
			topRatedCount++
		}
		if ps.Product.ViewCount >= 100 {
			trendingCount++
		}
	}

	return result
}
