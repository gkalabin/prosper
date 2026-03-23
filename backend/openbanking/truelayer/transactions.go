package truelayer

import (
	"context"
	"fmt"
	"net/url"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"

	prosperv1 "prosper/gen/prosper/v1"
	"prosper/moneyutil"
)

const (
	settledTransactionsURL = "https://api.truelayer.com/data/v1/accounts/%s/transactions?from=%s"
	pendingTransactionsURL = "https://api.truelayer.com/data/v1/accounts/%s/transactions/pending"
)

type transactionItem struct {
	TransactionID         string  `json:"transaction_id"`
	ProviderTransactionID string  `json:"provider_transaction_id"`
	Timestamp             string  `json:"timestamp"`
	Description           string  `json:"description"`
	Amount                float64 `json:"amount"`
	Meta                  struct {
		TransactionTime string `json:"transaction_time"`
	} `json:"meta"`
}

type transactionsBody struct {
	Results []transactionItem `json:"results"`
}

// FetchTransactions returns settled and pending transactions for the
// external account.
func (t *Provider) FetchTransactions(ctx context.Context, userID, bankID int32, externalAccountID string, since time.Time) ([]*prosperv1.OpenBankingTransaction, error) {
	access, err := t.accessToken(ctx, userID, bankID)
	if err != nil {
		return nil, err
	}
	escaped := url.PathEscape(externalAccountID)
	urls := []string{
		fmt.Sprintf(settledTransactionsURL, escaped, since.Format(dateOnlyFormat)),
		fmt.Sprintf(pendingTransactionsURL, escaped),
	}
	var out []*prosperv1.OpenBankingTransaction
	for _, u := range urls {
		var r transactionsBody
		if err := t.getJSON(ctx, u, access, &r); err != nil {
			return nil, err
		}
		for _, item := range r.Results {
			out = append(out, convertTransaction(item))
		}
	}
	return out, nil
}

func convertTransaction(item transactionItem) *prosperv1.OpenBankingTransaction {
	// provider_transaction_id is stable across the pending-to-settled transition
	id := item.ProviderTransactionID
	if id == "" {
		id = item.TransactionID
	}
	// Some underlying banks (e.g. Starling) report the actual
	// transaction time in meta.transaction_time; the top-level
	// timestamp is when the transaction settled. Prefer the meta
	// field when present.
	tsStr := item.Meta.TransactionTime
	if tsStr == "" {
		tsStr = item.Timestamp
	}
	ts, _ := time.Parse(time.RFC3339, tsStr)
	return &prosperv1.OpenBankingTransaction{
		ExternalTransactionId: id,
		Timestamp:             timestamppb.New(ts),
		Description:           item.Description,
		SignedAmountNanos:     moneyutil.FloatUnitsToNanos(item.Amount),
	}
}
