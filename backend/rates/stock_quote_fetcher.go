package rates

import (
	"context"
	"time"
)

// StockQuoteFetcher abstracts the external data source for stock quotes.
type StockQuoteFetcher interface {
	// FetchQuotes returns daily close prices for (exchange, ticker)
	// from the given timestamp. `from` is inclusive — quotes dated
	// exactly on `from` are returned.
	FetchQuotes(ctx context.Context, exchange, ticker string, from time.Time) ([]DailyQuote, error)
}

type DailyQuote struct {
	QuoteDate       time.Time
	ClosePriceNanos int64
	CurrencyCode    string
}
