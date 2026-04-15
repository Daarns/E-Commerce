package main

import (
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	var direction string
	flag.StringVar(&direction, "direction", "up", "Migration direction: up or down")
	flag.Parse()

	// Get database connection string from environment
	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5432")
	dbUser := getEnv("DB_USER", "postgres")
	dbPassword := getEnv("DB_PASSWORD", "postgres")
	dbName := getEnv("DB_NAME", "ecommerce_db")
	dbSSLMode := getEnv("DB_SSL_MODE", "disable")

	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		dbHost, dbPort, dbUser, dbPassword, dbName, dbSSLMode)

	log.Printf("📡 Connecting to database: %s:%s/%s", dbHost, dbPort, dbName)

	// Connect to database
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("❌ Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Test connection
	if err := db.Ping(); err != nil {
		log.Fatalf("❌ Failed to ping database: %v", err)
	}

	log.Println("✅ Connected to database successfully")

	// Get migrations directory
	migrationsDir := "migrations"
	if _, err := os.Stat(migrationsDir); os.IsNotExist(err) {
		log.Fatalf("❌ Migrations directory not found: %s", migrationsDir)
	}

	// Run migration
	if direction == "up" {
		log.Println("🚀 Running UP migrations...")
		if err := runMigration(db, migrationsDir, "001_initial_schema.up.sql"); err != nil {
			log.Fatalf("❌ Migration failed: %v", err)
		}
		log.Println("✅ Migration completed successfully!")
		log.Println("🔐 Default admin user: admin@ecommerce.local / Admin123!")
	} else if direction == "down" {
		log.Println("⬇️  Running DOWN migrations...")
		if err := runMigration(db, migrationsDir, "001_initial_schema.down.sql"); err != nil {
			log.Fatalf("❌ Rollback failed: %v", err)
		}
		log.Println("✅ Rollback completed successfully!")
	} else {
		log.Fatalf("❌ Invalid direction: %s (use 'up' or 'down')", direction)
	}
}

func runMigration(db *sql.DB, dir, filename string) error {
	filepath := filepath.Join(dir, filename)
	
	log.Printf("📄 Reading migration file: %s", filename)
	
	// Read migration file
	content, err := os.ReadFile(filepath)
	if err != nil {
		return fmt.Errorf("failed to read migration file: %w", err)
	}

	// Execute migration
	if _, err := db.Exec(string(content)); err != nil {
		return fmt.Errorf("failed to execute migration: %w", err)
	}

	log.Printf("✅ Executed: %s", filename)
	return nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
