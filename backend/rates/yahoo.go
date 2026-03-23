package rates

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"prosper/moneyutil"
)

// recentChartWindow is the lookback used when we only need Yahoo's
// metadata (currency) and don't care about historical points.
func recentChartWindow() time.Time {
	return time.Now().AddDate(0, 0, -7)
}

// YahooProvider implements both CurrencyRateFetcher and StockQuoteFetcher
// using Yahoo Finance's chart endpoint.
type YahooProvider struct {
	httpClient *http.Client
}

func NewYahooProvider() *YahooProvider {
	return &YahooProvider{
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

// FetchCurrencyRates fetches daily close rates for the sell→buy pair.
// Yahoo encodes currency pairs as "EURUSD=X" (SELLBUY=X).
func (y *YahooProvider) FetchCurrencyRates(ctx context.Context, sell, buy string, from time.Time) ([]DailyRate, error) {
	symbol := strings.ToUpper(sell+buy) + "=X"
	chart, err := y.fetchChart(ctx, symbol, from)
	if err != nil {
		return nil, err
	}
	out := make([]DailyRate, 0, len(chart.points))
	for _, p := range chart.points {
		out = append(out, DailyRate{RateDate: p.date, RateNanos: p.closeNanos})
	}
	return out, nil
}

// FetchQuotes fetches daily close prices for (exchange, ticker) on or
// after `from`.
func (y *YahooProvider) FetchQuotes(ctx context.Context, _exchange, ticker string, from time.Time) ([]DailyQuote, error) {
	chart, err := y.fetchChart(ctx, ticker, from)
	if err != nil {
		return nil, err
	}
	out := make([]DailyQuote, 0, len(chart.points))
	for _, p := range chart.points {
		out = append(out, DailyQuote{
			QuoteDate:       p.date,
			ClosePriceNanos: p.closeNanos,
			CurrencyCode:    chart.currency,
		})
	}
	return out, nil
}

// chartResult is the parsed shape of a Yahoo chart response: a list of
// (date, close) points plus the quote currency.
type chartResult struct {
	currency string
	points   []chartPoint
}

type chartPoint struct {
	date       time.Time
	closeNanos int64
}

// yahooChartResponse mirrors Yahoo's /v8/finance/chart payload. Only
// the fields we read are listed.
type yahooChartResponse struct {
	Chart struct {
		Result []struct {
			Meta struct {
				Currency string `json:"currency"`
			} `json:"meta"`
			Timestamp  []int64 `json:"timestamp"`
			Indicators struct {
				Quote []struct {
					Close []*float64 `json:"close"`
				} `json:"quote"`
			} `json:"indicators"`
		} `json:"result"`
		Error any `json:"error"`
	} `json:"chart"`
}

// fetchChart returns daily close prices, dates (UTC midnight) and the
// quote currency for a symbol.
func (y *YahooProvider) fetchChart(ctx context.Context, symbol string, from time.Time) (chartResult, error) {
	u := fmt.Sprintf("https://query1.finance.yahoo.com/v8/finance/chart/%s?period1=%d&period2=%d&interval=1d",
		url.PathEscape(symbol), from.Unix(), time.Now().Unix())
	body, err := y.do(ctx, u)
	if err != nil {
		return chartResult{}, err
	}
	var resp yahooChartResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return chartResult{}, err
	}
	if len(resp.Chart.Result) == 0 {
		return chartResult{}, nil
	}
	r := resp.Chart.Result[0]
	if len(r.Indicators.Quote) == 0 {
		return chartResult{currency: r.Meta.Currency}, nil
	}
	closes := r.Indicators.Quote[0].Close
	out := chartResult{
		currency: r.Meta.Currency,
		points:   make([]chartPoint, 0, len(r.Timestamp)),
	}
	for i, ts := range r.Timestamp {
		if i >= len(closes) || closes[i] == nil {
			continue
		}
		out.points = append(out.points, chartPoint{
			date:       truncateToDay(time.Unix(ts, 0).UTC()),
			closeNanos: moneyutil.FloatUnitsToNanos(*closes[i]),
		})
	}
	return out, nil
}

func (y *YahooProvider) do(ctx context.Context, u string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; ProsperBackend/1.0)")
	resp, err := y.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("yahoo HTTP %d for %s", resp.StatusCode, u)
	}
	return io.ReadAll(resp.Body)
}
