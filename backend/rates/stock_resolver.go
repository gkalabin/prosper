package rates

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/jmoiron/sqlx"

	"prosper/model"
)

// StockInfo describes the metadata an external source surfaces about
// a stock. Returned by StockMetadataFetcher when resolving a new
// (exchange, ticker) pair to populate the Stock table.
type StockInfo struct {
	CurrencyCode string
}

// StockMetadataFetcher resolves a (exchange, ticker) pair to a
// StockInfo. Implementations: YahooProvider (via lookupStockInfo).
type StockMetadataFetcher interface {
	LookupStock(ctx context.Context, exchange, ticker string) (StockInfo, error)
}

// LookupStock implements StockMetadataFetcher for YahooProvider. The
// chart endpoint returns the quote currency in its meta block, so we
// re-use the historical fetcher with a recent window.
func (y *YahooProvider) LookupStock(ctx context.Context, _exchange, ticker string) (StockInfo, error) {
	chart, err := y.fetchChart(ctx, ticker, recentChartWindow())
	if err != nil {
		return StockInfo{}, err
	}
	if chart.currency == "" {
		return StockInfo{}, fmt.Errorf("no currency for %s", ticker)
	}
	return StockInfo{CurrencyCode: chart.currency}, nil
}

// StockResolver looks up an existing Stock row by (exchange, ticker)
// or, when none exists, fetches its metadata and inserts a new row.
// Implements ledger.StockResolver.
type StockResolver struct {
	db   *sqlx.DB
	meta StockMetadataFetcher
}

func NewStockResolver(db *sqlx.DB, meta StockMetadataFetcher) *StockResolver {
	return &StockResolver{db: db, meta: meta}
}

// ResolveOrCreate returns the Stock.id for (exchange, ticker), creating
// a row if missing.
func (r *StockResolver) ResolveOrCreate(ctx context.Context, exchange, ticker string) (int32, error) {
	exchange = strings.ToUpper(exchange)
	ticker = strings.ToUpper(ticker)
	var id int32
	err := r.db.GetContext(ctx, &id,
		`SELECT id FROM Stock WHERE exchange = ? AND ticker = ?`, exchange, ticker)
	if err == nil {
		return id, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return 0, err
	}
	info, err := r.meta.LookupStock(ctx, exchange, ticker)
	if err != nil {
		return 0, fmt.Errorf("metadata lookup for %s: %w", ticker, err)
	}
	res, err := r.db.NamedExecContext(ctx,
		`INSERT INTO Stock
		        ( name,  exchange,  ticker,  currencyCode)
		 VALUES (:name, :exchange, :ticker, :currencyCode)`,
		model.Stock{
			Name:         ticker,
			Exchange:     exchange,
			Ticker:       ticker,
			CurrencyCode: strings.ToUpper(info.CurrencyCode),
		})
	if err != nil {
		return 0, err
	}
	newID, err := res.LastInsertId()
	if err != nil {
		return 0, err
	}
	return int32(newID), nil
}
