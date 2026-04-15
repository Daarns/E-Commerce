package models

import "errors"

var (
	// ErrOrderNotFound is returned when an order is not found
	ErrOrderNotFound = errors.New("order not found")

	// ErrInvalidOrder is returned for invalid order data
	ErrInvalidOrder = errors.New("invalid order")

	// ErrUnauthorized is returned when user is not authorized
	ErrUnauthorized = errors.New("unauthorized")
)
