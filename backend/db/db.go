package db

import (
	"prosper/config"

	_ "github.com/go-sql-driver/mysql"
	"github.com/jmoiron/sqlx"
)

// Connect opens a MySQL pool.
func Connect(cfg *config.Config) (*sqlx.DB, error) {
	db, err := sqlx.Connect("mysql", cfg.DBDSN)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(cfg.DBMaxOpenConns)
	db.SetMaxIdleConns(cfg.DBMaxIdleConns)
	return db, nil
}
