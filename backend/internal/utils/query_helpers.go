package utils

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

// GetIntQueryDefault gets integer query parameter with default value
func GetIntQueryDefault(c *gin.Context, key string, defaultValue int) int {
	if val := c.Query(key); val != "" {
		if intVal, err := strconv.Atoi(val); err == nil {
			return intVal
		}
	}
	return defaultValue
}
