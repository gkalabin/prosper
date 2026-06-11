package rates

import (
	"context"
	"fmt"
	"log"

	"github.com/jmoiron/sqlx"
	"google.golang.org/protobuf/types/known/timestamppb"

	"prosper/auth"
	"prosper/config"
	prosperv1 "prosper/gen/prosper/v1"
	"prosper/model"
)

// Service implements RatesServiceServer. It owns the periodic refresh
// loop (see scheduler.go) and the read-side query handlers.
type Service struct {
	prosperv1.UnimplementedRatesServiceServer
	db              *sqlx.DB
	cfg             *config.Config
	currencyFetcher CurrencyRateFetcher
	stockFetcher    StockQuoteFetcher
	stockMeta       StockMetadataFetcher

	// trigger carries out-of-band fetch signals (e.g. when
	// LedgerService.UpsertBankAccount introduces a new currency).
	// Buffered to one slot so notifications coalesce.
	trigger chan struct{}
}

func NewService(db *sqlx.DB, cfg *config.Config) *Service {
	yahoo := NewYahooProvider()
	return &Service{
		db:              db,
		cfg:             cfg,
		currencyFetcher: yahoo,
		stockFetcher:    yahoo,
		stockMeta:       yahoo,
		trigger:         make(chan struct{}, 1),
	}
}

// TriggerFetch asks the scheduler to run an out-of-band update on top
// of its periodic ticker. Coalesced — a burst of calls produces at most
// one extra fetch.
func (s *Service) TriggerFetch() {
	select {
	case s.trigger <- struct{}{}:
	default:
	}
}

// GetMarketDataForUser returns every exchange rate (used→display) and
// stock quote relevant to the given user. The backend computes the
// pair list from the user's accounts, transactions and DisplaySettings.
func (s *Service) GetMarketDataForUser(ctx context.Context, _ *prosperv1.GetMarketDataForUserRequest) (*prosperv1.GetMarketDataForUserResponse, error) {
	userID := auth.MustUserIDFromContext(ctx)
	resp := &prosperv1.GetMarketDataForUserResponse{}

	display, err := s.displayCurrencyForUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	usedCurrencies, err := s.currenciesForUser(ctx, userID)
	if err != nil {
		return nil, err
	}

	for _, sell := range usedCurrencies {
		if sell == display {
			continue
		}
		rates, err := s.allExchangeRates(ctx, sell, display)
		if err != nil {
			log.Printf("rates: market data %s/%s: %v", sell, display, err)
			continue
		}
		for i := range rates {
			r := &rates[i]
			if r.RateNanos == nil {
				log.Printf("rates: exchange rate id=%d %s/%s at %s has null rateNanos, skipping",
					r.ID, r.CurrencyCodeFrom, r.CurrencyCodeTo, r.RateTimestamp)
				continue
			}
			resp.Rates = append(resp.Rates, exchangeRateToProto(r))
		}
	}

	quotes, err := s.allStockQuotes(ctx)
	if err != nil {
		return nil, err
	}
	for i := range quotes {
		q := &quotes[i]
		if q.ValueNanos == nil {
			log.Printf("rates: stock quote id=%d stock=%s/%s at %s has null valueNanos, skipping",
				q.ID, q.StockExchange, q.StockTicker, q.QuoteTimestamp)
			continue
		}
		resp.Quotes = append(resp.Quotes, stockQuoteToProto(q))
	}
	return resp, nil
}

// SearchStocks returns the stocks matching a free-text query.
func (s *Service) SearchStocks(ctx context.Context, req *prosperv1.SearchStocksRequest) (*prosperv1.SearchStocksResponse, error) {
	stocks, err := s.stockMeta.SearchStocks(ctx, req.GetQuery())
	if err != nil {
		return nil, err
	}
	return &prosperv1.SearchStocksResponse{Stocks: stocks}, nil
}

// allExchangeRates returns the entire stored history for (from, to).
// Used by GetMarketDataForUser, which wants every observation the user
// has accumulated.
func (s *Service) allExchangeRates(ctx context.Context, from, to string) ([]model.ExchangeRate, error) {
	var rates []model.ExchangeRate
	err := s.db.SelectContext(ctx, &rates,
		`SELECT * FROM ExchangeRate
		 WHERE currencyCodeFrom = ? AND currencyCodeTo = ?
		   AND rateNanos IS NOT NULL
		 ORDER BY rateTimestamp ASC`,
		from, to)
	return rates, err
}

// allStockQuotes returns every recorded non-null stock quote, used by
// the per-user market-data endpoint.
func (s *Service) allStockQuotes(ctx context.Context) ([]model.StockQuote, error) {
	var rows []model.StockQuote
	err := s.db.SelectContext(ctx, &rows,
		`SELECT * FROM StockQuote
		 WHERE valueNanos IS NOT NULL
		 ORDER BY quoteTimestamp ASC`)
	return rows, err
}

func exchangeRateToProto(r *model.ExchangeRate) *prosperv1.ExchangeRate {
	return &prosperv1.ExchangeRate{
		CurrencyCodeFrom: r.CurrencyCodeFrom,
		CurrencyCodeTo:   r.CurrencyCodeTo,
		RateTimestamp:    timestamppb.New(r.RateTimestamp),
		RateNanos:        *r.RateNanos,
	}
}

func stockQuoteToProto(q *model.StockQuote) *prosperv1.StockQuote {
	return &prosperv1.StockQuote{
		StockExchange:      q.StockExchange,
		StockTicker:        q.StockTicker,
		QuoteTimestamp:     timestamppb.New(q.QuoteTimestamp),
		PricePerShareNanos: *q.ValueNanos,
	}
}

func (s *Service) displayCurrencyForUser(ctx context.Context, userID int32) (string, error) {
	var code string
	if err := s.db.GetContext(ctx, &code,
		`SELECT displayCurrencyCode FROM DisplaySettings WHERE userId = ?`, userID); err != nil {
		return "", fmt.Errorf("DisplaySettings missing for user %d: %w", userID, err)
	}
	return code, nil
}

// currenciesForUser returns every currency code that affects the
// user's pages: the natural currency of each of their bank accounts,
// the quote currency of any stock they hold, and any currency mentioned
// on transactions they've recorded. Driven by GetMarketDataForUser to
// decide which exchange-rate pairs are relevant.
func (s *Service) currenciesForUser(ctx context.Context, userID int32) ([]string, error) {
	var codes []string
	q := `SELECT DISTINCT currencyCode FROM (
		SELECT currencyCode FROM BankAccount WHERE userId = ? AND currencyCode IS NOT NULL
		UNION
		SELECT s.currencyCode FROM BankAccount ba
			JOIN Stock s ON s.exchange = ba.stockExchange AND s.ticker = ba.stockTicker WHERE ba.userId = ?
		UNION
		SELECT s.currencyCode FROM EntryLine el
			JOIN Transaction t ON t.id = el.transactionId
			JOIN Stock s ON s.exchange = el.stockExchange AND s.ticker = el.stockTicker WHERE t.userId = ?
		UNION
		SELECT el.currencyCode FROM EntryLine el
			JOIN Transaction t ON t.id = el.transactionId
			WHERE t.userId = ? AND el.currencyCode IS NOT NULL
	) t`
	if err := s.db.SelectContext(ctx, &codes, q, userID, userID, userID, userID); err != nil {
		return nil, err
	}
	return codes, nil
}
