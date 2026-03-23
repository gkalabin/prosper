package rates

import (
	"context"
	"time"
)

// CurrencyRateFetcher abstracts the external data source for currency
// exchange rates.
type CurrencyRateFetcher interface {
	FetchCurrencyRates(ctx context.Context, sell, buy string, from time.Time) ([]DailyRate, error)
}

type DailyRate struct {
	RateDate  time.Time
	RateNanos int64
}
