package rates

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"

	prosperv1 "prosper/gen/prosper/v1"
	"prosper/model"
)

// StockInfo describes the metadata an external source surfaces about
// a stock. Returned by StockMetadataFetcher when resolving a new
// (exchange, ticker) pair to populate the Stock table.
type StockInfo struct {
	CurrencyCode string
}

// StockMetadataFetcher finds information about stocks.
type StockMetadataFetcher interface {
	LookupStock(ctx context.Context, exchange, ticker string) (StockInfo, error)
	SearchStocks(ctx context.Context, query string) ([]*prosperv1.StockSearchResult, error)
}

// LookupStock implements StockMetadataFetcher for YahooProvider. The
// chart endpoint returns the quote currency in its meta block, so we
// re-use the historical fetcher with a recent window.
func (y *YahooProvider) LookupStock(ctx context.Context, _exchange, ticker string) (StockInfo, error) {
	chart, err := y.fetchChart(ctx, ticker, time.Now().AddDate(0, 0, -7))
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
type StockResolver struct {
	db   *sqlx.DB
	meta StockMetadataFetcher
}

func NewStockResolver(db *sqlx.DB, meta StockMetadataFetcher) *StockResolver {
	return &StockResolver{db: db, meta: meta}
}

// EnsureStock guarantees a Stock row exists for (exchange, ticker),
// creating it from fetched metadata when missing. The exchange and
// ticker must already be uppercased by the caller.
func (r *StockResolver) EnsureStock(ctx context.Context, exchange, ticker string) error {
	exchange = strings.ToUpper(exchange)
	ticker = strings.ToUpper(ticker)
	var n int
	err := r.db.GetContext(ctx, &n,
		`SELECT COUNT(*) FROM Stock WHERE exchange = ? AND ticker = ?`, exchange, ticker)
	if err != nil {
		return err
	}
	if n > 0 {
		return nil
	}
	info, err := r.meta.LookupStock(ctx, exchange, ticker)
	if err != nil {
		return fmt.Errorf("metadata lookup for %s: %w", ticker, err)
	}
	if _, err := r.db.NamedExecContext(ctx,
		`INSERT INTO Stock
		        ( name,  exchange,  ticker,  currencyCode)
		 VALUES (:name, :exchange, :ticker, :currencyCode)`,
		model.Stock{
			Name:         ticker,
			Exchange:     exchange,
			Ticker:       ticker,
			CurrencyCode: strings.ToUpper(info.CurrencyCode),
		}); err != nil {
		return err
	}
	return nil
}
