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
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	reset := flag.Bool("reset", false, "remove demo seed records instead of inserting them")
	flag.Parse()

	seedFile := findSeedFile("demo.sql")
	if *reset {
		seedFile = findSeedFile("reset_demo.sql")
	}

	content, err := os.ReadFile(seedFile)
	if err != nil {
		log.Fatalf("failed to read %s: %v", seedFile, err)
	}

	db, err := sql.Open("postgres", connectionString())
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	if _, err := db.Exec(string(content)); err != nil {
		log.Fatalf("failed to execute %s: %v", seedFile, err)
	}

	if *reset {
		log.Println("demo seed records removed")
		return
	}
	log.Println("demo seed data is ready")
}

func findSeedFile(name string) string {
	candidates := []string{
		filepath.Join("database", "seeds", name),
		filepath.Join("..", "database", "seeds", name),
	}
	for _, candidate := range candidates {
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
	}
	return candidates[0]
}

func connectionString() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		getEnv("DB_HOST", "localhost"),
		getEnv("DB_PORT", "5432"),
		getEnv("DB_USER", "postgres"),
		getEnv("DB_PASSWORD", "postgres"),
		getEnv("DB_NAME", "ecommerce_db"),
		getEnv("DB_SSL_MODE", "disable"),
	)
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
