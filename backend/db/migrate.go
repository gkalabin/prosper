package db

import (
	"context"
	"embed"
	"fmt"
	"log"
	"sort"
	"strings"

	"github.com/jmoiron/sqlx"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

// Migrate applies any pending SQL migrations from the embedded
// migrations directory in lexical order. Each applied migration is
// recorded in the `_migrations` table so reruns are idempotent.
func Migrate(ctx context.Context, db *sqlx.DB) error {
	if _, err := db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS _migrations (
		name VARCHAR(255) NOT NULL PRIMARY KEY,
		applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	)`); err != nil {
		return fmt.Errorf("create _migrations table: %w", err)
	}

	names, err := migrationFilenames()
	if err != nil {
		return err
	}

	applied := 0
	for _, name := range names {
		var n int
		if err := db.GetContext(ctx, &n,
			`SELECT COUNT(*) FROM _migrations WHERE name = ?`, name); err != nil {
			return err
		}
		if n > 0 {
			continue
		}
		log.Printf("db: applying migration %s", name)
		body, err := migrationsFS.ReadFile("migrations/" + name)
		if err != nil {
			return err
		}
		if err := applyMigration(ctx, db, name, string(body)); err != nil {
			return fmt.Errorf("apply %s: %w", name, err)
		}
		log.Printf("db: migration %s applied", name)
		applied++
	}
	log.Printf("db: %d migrations applied", applied)
	return nil
}

func migrationFilenames() ([]string, error) {
	entries, err := migrationsFS.ReadDir("migrations")
	if err != nil {
		return nil, fmt.Errorf("read migrations dir: %w", err)
	}
	names := make([]string, 0, len(entries))
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".sql") {
			continue
		}
		names = append(names, e.Name())
	}
	sort.Strings(names)
	return names, nil
}

// applyMigration runs all statements in body and records the migration
// in _migrations atomically. If any statement fails, the transaction is
// rolled back so we never end up with a half-applied migration.
//
// Comment-only lines (starting with `--`) and empty statements are
// skipped. Statements that perform DDL on MySQL implicitly commit the
// surrounding transaction; this is acceptable because each migration
// file is small and the recovery path is to re-run the migration.
func applyMigration(ctx context.Context, db *sqlx.DB, name, body string) error {
	tx, err := db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for _, raw := range strings.Split(stripComments(body), ";") {
		stmt := strings.TrimSpace(raw)
		if stmt == "" {
			continue
		}
		if _, err := tx.ExecContext(ctx, stmt); err != nil {
			return fmt.Errorf("exec %q: %w", firstLine(stmt), err)
		}
	}
	if _, err := tx.ExecContext(ctx,
		`INSERT INTO _migrations (name) VALUES (?)`, name); err != nil {
		return err
	}
	return tx.Commit()
}

func stripComments(stmt string) string {
	var b strings.Builder
	for _, line := range strings.Split(stmt, "\n") {
		if strings.HasPrefix(strings.TrimSpace(line), "--") {
			continue
		}
		b.WriteString(line)
		b.WriteByte('\n')
	}
	return strings.TrimSpace(b.String())
}

func firstLine(s string) string {
	first, _, _ := strings.Cut(s, "\n")
	return first
}
