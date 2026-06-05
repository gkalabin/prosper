package truelayer

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/url"
	"time"

	"prosper/model"
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
	Results []json.RawMessage `json:"results"`
}

// FetchTransactions returns settled and pending transactions for the
// external account.
func (t *Provider) FetchTransactions(ctx context.Context, userID, bankID int32, externalAccountID string, since time.Time) ([]model.OpenBankingTransaction, error) {
	access, err := t.accessToken(ctx, userID, bankID)
	if err != nil {
		return nil, err
	}
	escaped := url.PathEscape(externalAccountID)
	urls := []string{
		fmt.Sprintf(settledTransactionsURL, escaped, since.Format(dateOnlyFormat)),
		fmt.Sprintf(pendingTransactionsURL, escaped),
	}
	var out []model.OpenBankingTransaction
	for _, u := range urls {
		var r transactionsBody
		if err := t.getJSON(ctx, u, access, &r); err != nil {
			return nil, err
		}
		for _, raw := range r.Results {
			var item transactionItem
			if err := json.Unmarshal(raw, &item); err != nil {
				log.Printf("truelayer: skip unparsable transaction on account %s: %v", externalAccountID, err)
				continue
			}
			out = append(out, convertTransaction(item, raw))
		}
	}
	return out, nil
}

func convertTransaction(item transactionItem, raw json.RawMessage) model.OpenBankingTransaction {
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
	return model.NewOpenBankingTransaction(id, ts, item.Description, moneyutil.FloatUnitsToNanos(item.Amount), raw)
}
