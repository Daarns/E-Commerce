package models

import (
	"time"

	"github.com/google/uuid"
)

const (
	ReviewStatusPending  = "pending"
	ReviewStatusApproved = "approved"
	ReviewStatusRejected = "rejected"
)

// ProductReview represents a product review with rating and text
type ProductReview struct {
	ID                 uuid.UUID     `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	ProductID          uuid.UUID     `gorm:"type:uuid;not null" json:"product_id"`
	Product            *Product      `json:"product,omitempty"`
	UserID             uuid.UUID     `gorm:"type:uuid;not null" json:"user_id"`
	User               *User         `json:"user,omitempty"`
	OrderID            *uuid.UUID    `gorm:"type:uuid" json:"order_id,omitempty"`
	Rating             int           `gorm:"not null;check:rating >= 1 and rating <= 5" json:"rating"`
	Title              *string       `gorm:"type:varchar(100)" json:"title,omitempty"`
	ReviewText         *string       `gorm:"type:text" json:"review_text,omitempty"`
	HelpfulCount       int64         `gorm:"default:0" json:"helpful_count"`
	UnhelpfulCount     int64         `gorm:"default:0" json:"unhelpful_count"`
	IsVerifiedPurchase bool          `gorm:"default:false" json:"is_verified_purchase"`
	Status             string        `gorm:"size:20;not null;default:'pending'" json:"status"`
	Images             []ReviewImage `gorm:"foreignKey:ReviewID" json:"images,omitempty"`
	CreatedAt          time.Time     `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt          time.Time     `gorm:"autoUpdateTime" json:"updated_at"`
}

// TableName specifies the table name for ProductReview
func (ProductReview) TableName() string {
	return "product_reviews"
}

type ReviewImage struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	ReviewID  uuid.UUID `gorm:"type:uuid;not null" json:"review_id"`
	ImageURL  string    `gorm:"type:text;not null" json:"image_url"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (ReviewImage) TableName() string {
	return "review_images"
}

// ReviewHelpfulVote represents a vote on whether a review is helpful
type ReviewHelpfulVote struct {
	ID        uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	ReviewID  uuid.UUID      `gorm:"type:uuid;not null" json:"review_id"`
	Review    *ProductReview `gorm:"foreignKey:ReviewID" json:"review,omitempty"`
	UserID    uuid.UUID      `gorm:"type:uuid;not null" json:"user_id"`
	User      *User          `gorm:"foreignKey:UserID" json:"user,omitempty"`
	IsHelpful bool           `gorm:"not null" json:"is_helpful"`
	CreatedAt time.Time      `gorm:"autoCreateTime" json:"created_at"`
}

// TableName specifies the table name for ReviewHelpfulVote
func (ReviewHelpfulVote) TableName() string {
	return "review_helpful_votes"
}

// ReviewStatistics holds review stats for a product
type ReviewStatistics struct {
	ProductID       uuid.UUID     `json:"product_id"`
	AverageRating   float64       `json:"average_rating"`
	TotalReviews    int64         `json:"total_reviews"`
	RatingBreakdown map[int]int64 `json:"rating_breakdown"` // rating -> count
}

type ReviewEligibilityResponse struct {
	CanReview bool       `json:"can_review"`
	Reason    string     `json:"reason,omitempty"`
	OrderID   *uuid.UUID `json:"order_id,omitempty"`
}

// CreateReviewRequest represents request to create a review
type CreateReviewRequest struct {
	Rating     int      `json:"rating" binding:"required,min=1,max=5"`
	Title      *string  `json:"title" binding:"max=100"`
	ReviewText *string  `json:"review_text"`
	ImageURLs  []string `json:"image_urls,omitempty"`
}

// UpdateReviewRequest represents request to update a review
type UpdateReviewRequest struct {
	Rating     *int    `json:"rating" binding:"omitempty,min=1,max=5"`
	Title      *string `json:"title" binding:"omitempty,max=100"`
	ReviewText *string `json:"review_text"`
}

// VoteHelpfulRequest represents request to vote on review helpfulness
type VoteHelpfulRequest struct {
	IsHelpful bool `json:"is_helpful" binding:"required"`
}

// ReviewListResponse represents paginated review list
type ReviewListResponse struct {
	Reviews    []ProductReviewResponse `json:"reviews"`
	Total      int64                   `json:"total"`
	Page       int                     `json:"page"`
	PageSize   int                     `json:"page_size"`
	TotalPages int                     `json:"total_pages"`
}

// ProductReviewResponse is the response format for reviews
type ProductReviewResponse struct {
	ID                 uuid.UUID  `json:"id"`
	ProductID          uuid.UUID  `json:"product_id"`
	ProductName        string     `json:"product_name,omitempty"`
	UserID             uuid.UUID  `json:"user_id"`
	OrderID            *uuid.UUID `json:"order_id,omitempty"`
	UserName           string     `json:"user_name"`
	UserEmail          string     `json:"user_email,omitempty"`
	Rating             int        `json:"rating"`
	Title              *string    `json:"title,omitempty"`
	ReviewText         *string    `json:"review_text,omitempty"`
	HelpfulCount       int64      `json:"helpful_count"`
	UnhelpfulCount     int64      `json:"unhelpful_count"`
	IsVerifiedPurchase bool       `json:"is_verified_purchase"`
	Status             string     `json:"status"`
	ImageURLs          []string   `json:"image_urls,omitempty"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
	UserHasVoted       *bool      `json:"user_has_voted,omitempty"`
	UserVoteType       *string    `json:"user_vote_type,omitempty"`
}

// ReviewSortBy defines review sorting options
type ReviewSortBy string

const (
	SortByRecent        ReviewSortBy = "recent"
	SortByHelpful       ReviewSortBy = "helpful"
	SortByHighestRating ReviewSortBy = "highest_rating"
	SortByLowestRating  ReviewSortBy = "lowest_rating"
)

type AdminModerateReviewRequest struct {
	Status string `json:"status" binding:"required,oneof=pending approved rejected"`
}
