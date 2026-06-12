package main

import (
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	var direction string
	flag.StringVar(&direction, "direction", "up", "Migration direction: up or down")
	flag.Parse()

	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5432")
	dbUser := getEnv("DB_USER", "postgres")
	dbPassword := getEnv("DB_PASSWORD", "postgres")
	dbName := getEnv("DB_NAME", "ecommerce_db")
	dbSSLMode := getEnv("DB_SSL_MODE", "disable")

	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		dbHost, dbPort, dbUser, dbPassword, dbName, dbSSLMode)

	log.Printf("📡 Connecting to database: %s:%s/%s", dbHost, dbPort, dbName)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("❌ Failed to connect to database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("❌ Failed to ping database: %v", err)
	}

	log.Println("✅ Connected to database successfully")

	// Create migration history table
	createMigrationHistoryTable(db)

	migrationsDir := "migrations"
	if _, err := os.Stat(migrationsDir); os.IsNotExist(err) {
		log.Fatalf("❌ Migrations directory not found: %s", migrationsDir)
	}

	if direction == "up" {
		log.Println("🚀 Running UP migrations...")
		runAllMigrationsUp(db, migrationsDir)
		log.Println("✅ All migrations completed!")
	} else if direction == "down" {
		log.Println("⬇️  Running DOWN migrations...")
		rollbackLastMigration(db, migrationsDir)
	} else {
		log.Fatalf("❌ Invalid direction: %s", direction)
	}
}

func createMigrationHistoryTable(db *sql.DB) {
	query := `
	CREATE TABLE IF NOT EXISTS schema_migrations (
		id SERIAL PRIMARY KEY,
		version VARCHAR(255) NOT NULL UNIQUE,
		installed_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`
	db.Exec(query)
}

func getMigrationHistory(db *sql.DB) map[string]bool {
	applied := make(map[string]bool)
	rows, err := db.Query("SELECT version FROM schema_migrations")
	if err != nil {
		return applied
	}
	defer rows.Close()

	for rows.Next() {
		var version string
		if err := rows.Scan(&version); err == nil {
			applied[version] = true
		}
	}
	return applied
}

func recordMigration(db *sql.DB, version string) {
	query := `INSERT INTO schema_migrations (version) VALUES ($1)
	         ON CONFLICT (version) DO NOTHING`
	db.Exec(query, version)
}

func runAllMigrationsUp(db *sql.DB, dir string) {
	files, err := os.ReadDir(dir)
	if err != nil {
		log.Fatalf("❌ Failed to read migrations directory: %v", err)
	}

	var migrations []string
	for _, file := range files {
		if !file.IsDir() && strings.HasSuffix(file.Name(), ".up.sql") {
			migrations = append(migrations, file.Name())
		}
	}

	sort.Strings(migrations)
	applied := getMigrationHistory(db)

	for _, migration := range migrations {
		version := strings.TrimSuffix(migration, ".up.sql")

		if applied[version] {
			log.Printf("⏭️  Skipping already applied: %s", version)
			continue
		}

		log.Printf("📄 Running migration: %s", version)

		if err := runMigrationFile(db, dir, migration); err != nil {
			log.Printf("⚠️  %v (continuing...)", err)
		} else {
			recordMigration(db, version)
			log.Printf("✅ Completed: %s", version)
		}
	}
}

func runMigrationFile(db *sql.DB, dir, filename string) error {
	filepath := filepath.Join(dir, filename)

	content, err := os.ReadFile(filepath)
	if err != nil {
		return fmt.Errorf("failed to read file: %w", err)
	}

	statements := splitSQLStatements(string(content))

	for _, statement := range statements {
		if statement == "" {
			continue
		}

		if _, err := db.Exec(statement); err != nil {
			errStr := err.Error()
			// Skip "already exists" errors (safe to continue)
			if strings.Contains(errStr, "already exists") ||
				strings.Contains(errStr, "duplicate key") ||
				strings.Contains(errStr, "UNIQUE constraint") {
				log.Printf("  ℹ️  Skipping: %s", strings.Split(errStr, ":")[0])
				continue
			}
			// For other errors, still return but migration won't be marked as complete
			return fmt.Errorf("SQL error in %s: %v", filename, err)
		}
	}

	return nil
}

func rollbackLastMigration(db *sql.DB, dir string) {
	var lastVersion string
	err := db.QueryRow(`
		SELECT version FROM schema_migrations
		ORDER BY installed_on DESC LIMIT 1
	`).Scan(&lastVersion)

	if err != nil {
		log.Println("No migrations to rollback")
		return
	}

	downFile := lastVersion + ".down.sql"
	downPath := filepath.Join(dir, downFile)

	if _, err := os.Stat(downPath); os.IsNotExist(err) {
		log.Printf("⚠️  Rollback file not found: %s", downFile)
		return
	}

	log.Printf("📄 Executing rollback: %s", downFile)

	if err := runMigrationFile(db, dir, downFile); err != nil {
		log.Printf("⚠️  Rollback error: %v", err)
		return
	}

	db.Exec("DELETE FROM schema_migrations WHERE version = $1", lastVersion)
	log.Printf("✅ Rolled back: %s", lastVersion)
}

func splitSQLStatements(content string) []string {
	var statements []string
	var current strings.Builder
	var inDollarQuote bool
	var dollarQuoteTag string
	var i int

	for i < len(content) {
		ch := rune(content[i])

		// Handle dollar-quoted strings
		if ch == '$' {
			j := i + 1
			for j < len(content) && (isAlphaNumeric(rune(content[j])) || content[j] == '_') {
				j++
			}
			if j < len(content) && content[j] == '$' {
				tag := content[i : j+1]
				if inDollarQuote && tag == dollarQuoteTag {
					inDollarQuote = false
					dollarQuoteTag = ""
					current.WriteString(tag)
					i = j + 1
					continue
				} else if !inDollarQuote {
					inDollarQuote = true
					dollarQuoteTag = tag
					current.WriteString(tag)
					i = j + 1
					continue
				}
			}
		}

		// Handle semicolon as statement terminator
		if !inDollarQuote && ch == ';' {
			current.WriteRune(ch)
			stmt := strings.TrimSpace(current.String())
			if stmt != "" && stmt != ";" {
				statements = append(statements, stmt)
			}
			current.Reset()
			i++
			continue
		}

		current.WriteRune(ch)
		i++
	}

	stmt := strings.TrimSpace(current.String())
	if stmt != "" && stmt != ";" {
		statements = append(statements, stmt)
	}

	return statements
}

func isAlphaNumeric(ch rune) bool {
	return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9')
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
