package rates

import (
	"context"
	"database/sql"
	"errors"
	"log"
	"sync"
	"time"

	"prosper/model"
	"prosper/moneyutil"
)

// initialFetchWindowDays is the size of the initial backfill window when
// no rates are present for a pair yet.
const initialFetchWindowDays = 30

// StartScheduler runs an immediate update, then on RateRefreshInterval.
// Also responds to TriggerFetch signals for out-of-band updates. If the
// configured interval is zero the scheduler does not run — external
// fetches stay disabled and the caller still sees an empty response
// from the read endpoints. The goroutine is registered on wg so the
// caller can block on shutdown until the in-flight refresh returns.
func (s *Service) StartScheduler(ctx context.Context, wg *sync.WaitGroup) {
	if s.cfg.RateRefreshInterval == 0 {
		log.Println("rates: refresh interval is 0, scheduler disabled")
		return
	}
	log.Printf("rates: scheduler started, interval=%s", s.cfg.RateRefreshInterval)
	wg.Go(func() {
		s.runUpdate(ctx)
		ticker := time.NewTicker(s.cfg.RateRefreshInterval)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				log.Println("rates: scheduler stopping")
				return
			case <-ticker.C:
				log.Println("rates: scheduler tick")
				s.runUpdate(ctx)
			case <-s.trigger:
				log.Println("rates: scheduler explicitly triggered")
				s.runUpdate(ctx)
			}
		}
	})
}

// runUpdate refreshes rates and quotes for every (used currency,
// per-user display currency) pair currently configured, plus all known
// stocks.
func (s *Service) runUpdate(ctx context.Context) {
	start := time.Now()
	log.Printf("rates: refresh starting")
	pairs, err := s.activePairs(ctx)
	if err != nil {
		log.Printf("rates: activePairs failed: %v", err)
		return
	}
	errors := 0
	for _, p := range pairs {
		if err := s.refreshPair(ctx, p[0], p[1]); err != nil {
			errors++
			log.Printf("rates: refresh %s/%s failed: %v", p[0], p[1], err)
		}
	}
	if err := s.refreshAllStocks(ctx); err != nil {
		log.Printf("rates: refreshAllStocks: %v", err)
	}
	log.Printf("rates: refresh done (pairs=%d errors=%d dur=%s)", len(pairs), errors, time.Since(start))
}

// activePairs returns one (sell, buy) pair per (used currency,
// user.displayCurrency) combination, deduplicated. A pair is only
// generated when at least one user has that display currency.
func (s *Service) activePairs(ctx context.Context) ([][2]string, error) {
	used, err := s.usedCurrencyCodes(ctx)
	if err != nil {
		return nil, err
	}
	displays, err := s.distinctDisplayCurrencies(ctx)
	if err != nil {
		return nil, err
	}
	return buildPairs(used, displays), nil
}

// buildPairs returns every (sell, buy) pair where sell ∈ used,
// buy ∈ displays and sell ≠ buy, deduplicated.
func buildPairs(used, displays []string) [][2]string {
	pairs := [][2]string{}
	seen := map[[2]string]bool{}
	for _, sell := range used {
		for _, buy := range displays {
			if sell == buy {
				continue
			}
			k := [2]string{sell, buy}
			if !seen[k] {
				seen[k] = true
				pairs = append(pairs, k)
			}
		}
	}
	return pairs
}

func (s *Service) distinctDisplayCurrencies(ctx context.Context) ([]string, error) {
	var codes []string
	if err := s.db.SelectContext(ctx, &codes,
		`SELECT DISTINCT displayCurrencyCode FROM DisplaySettings`); err != nil {
		return nil, err
	}
	return codes, nil
}

// usedCurrencyCodes returns the union of currency codes appearing on
// BankAccount, EntryLine and Stock tables — i.e. every currency for
// which any user has data.
func (s *Service) usedCurrencyCodes(ctx context.Context) ([]string, error) {
	var codes []string
	q := `SELECT DISTINCT currencyCode FROM (
		SELECT currencyCode FROM BankAccount WHERE currencyCode IS NOT NULL
		UNION
		SELECT currencyCode FROM EntryLine WHERE currencyCode IS NOT NULL
		UNION
		SELECT currencyCode FROM Stock
	) t`
	if err := s.db.SelectContext(ctx, &codes, q); err != nil {
		return nil, err
	}
	return codes, nil
}

// refreshPair fetches rates for the (sell, buy) pair from the latest
// known timestamp through today and upserts them into ExchangeRate.
func (s *Service) refreshPair(ctx context.Context, sell, buy string) error {
	from, err := s.nextFetchStartForPair(ctx, sell, buy)
	if err != nil {
		return err
	}
	rates, err := s.currencyFetcher.FetchCurrencyRates(ctx, sell, buy, from)
	if err != nil {
		return err
	}
	if len(rates) == 0 {
		return nil
	}
	rows := make([]model.ExchangeRate, len(rates))
	for i, r := range rates {
		nanos := r.RateNanos
		rows[i] = model.ExchangeRate{
			CurrencyCodeFrom: sell,
			CurrencyCodeTo:   buy,
			RateTimestamp:    r.RateDate,
			RateNanos:        &nanos,
		}
	}
	_, err = s.db.NamedExecContext(ctx,
		`INSERT INTO ExchangeRate
		        ( currencyCodeFrom,  currencyCodeTo,  rateTimestamp,  rateNanos)
		 VALUES (:currencyCodeFrom, :currencyCodeTo, :rateTimestamp, :rateNanos)
		 ON DUPLICATE KEY UPDATE rateNanos = VALUES(rateNanos)`,
		rows)
	return err
}

// nextFetchStartForPair returns the timestamp the fetcher should
// fetch from for the next refresh of the (sell, buy) pair.
func (s *Service) nextFetchStartForPair(ctx context.Context, sell, buy string) (time.Time, error) {
	var latest model.ExchangeRate
	err := s.db.GetContext(ctx, &latest,
		`SELECT * FROM ExchangeRate
		 WHERE currencyCodeFrom = ? AND currencyCodeTo = ?
		 ORDER BY rateTimestamp DESC LIMIT 1`,
		sell, buy)
	now := time.Now().UTC()
	if errors.Is(err, sql.ErrNoRows) {
		return now.AddDate(0, 0, -initialFetchWindowDays), nil
	}
	if err != nil {
		return time.Time{}, err
	}
	return nextFetchAfter(latest.RateTimestamp, now), nil
}

// nextFetchAfter implements the "today vs past" branch shared between
// rate and stock-quote refresh paths.
func nextFetchAfter(latestStored, now time.Time) time.Time {
	latestDay := truncateToDay(latestStored)
	today := truncateToDay(now)
	if !latestDay.Before(today) {
		return latestDay
	}
	return latestDay.AddDate(0, 0, 1)
}

// truncateToDay zeroes out the time-of-day component, returning the
// start of the calendar day in t's location.
func truncateToDay(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
}

// refreshAllStocks iterates known stocks and refreshes their quote
// history. Each stock's per-row work is in refreshStock.
func (s *Service) refreshAllStocks(ctx context.Context) error {
	var stocks []model.Stock
	if err := s.db.SelectContext(ctx, &stocks, `SELECT * FROM Stock`); err != nil {
		return err
	}
	for i := range stocks {
		if err := s.refreshStock(ctx, &stocks[i]); err != nil {
			log.Printf("rates: refresh stock %s: %v", stocks[i].Ticker, err)
		}
	}
	return nil
}

func (s *Service) refreshStock(ctx context.Context, st *model.Stock) error {
	from, err := s.nextFetchStartForStock(ctx, st.Exchange, st.Ticker)
	if err != nil {
		return err
	}
	quotes, err := s.stockFetcher.FetchQuotes(ctx, st.Exchange, st.Ticker, from)
	if err != nil {
		return err
	}
	if len(quotes) == 0 {
		return nil
	}
	rows := make([]model.StockQuote, len(quotes))
	for i, q := range quotes {
		valueCents := q.ClosePriceNanos / moneyutil.NanosPerCent
		rows[i] = model.StockQuote{
			StockExchange:  st.Exchange,
			StockTicker:    st.Ticker,
			QuoteTimestamp: q.QuoteDate,
			Value:          &valueCents,
		}
	}
	_, err = s.db.NamedExecContext(ctx,
		`INSERT INTO StockQuote
		        ( stockExchange,  stockTicker,  quoteTimestamp,  value)
		 VALUES (:stockExchange, :stockTicker, :quoteTimestamp, :value)
		 ON DUPLICATE KEY UPDATE value = VALUES(value)`,
		rows)
	return err
}

func (s *Service) nextFetchStartForStock(ctx context.Context, exchange, ticker string) (time.Time, error) {
	var latest model.StockQuote
	err := s.db.GetContext(ctx, &latest,
		`SELECT * FROM StockQuote
		 WHERE stockExchange = ? AND stockTicker = ?
		 ORDER BY quoteTimestamp DESC LIMIT 1`,
		exchange, ticker)
	now := time.Now().UTC()
	if errors.Is(err, sql.ErrNoRows) {
		return now.AddDate(0, 0, -initialFetchWindowDays), nil
	}
	if err != nil {
		return time.Time{}, err
	}
	return nextFetchAfter(latest.QuoteTimestamp, now), nil
}
