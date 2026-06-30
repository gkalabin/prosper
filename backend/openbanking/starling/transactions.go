package starling

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"prosper/model"
	"prosper/moneyutil"
)

const feedURL = "https://api.starlingbank.com/api/v2/feed/account/%s/category/%s?changesSince=%s"

type feedResponse struct {
	FeedItems []json.RawMessage `json:"feedItems"`
}

type feedItem struct {
	FeedItemUID string `json:"feedItemUid"`
	Direction   string `json:"direction"`
	Amount      struct {
		MinorUnits int64 `json:"minorUnits"`
	} `json:"amount"`
	TransactionTime  string `json:"transactionTime"`
	CounterPartyName string `json:"counterPartyName"`
	Status           string `json:"status"`
}

const (
	statusDeclined          = "DECLINED"
	statusUpcoming          = "UPCOMING"
	statusUpcomingCancelled = "UPCOMING_CANCELLED"
)

func (s *Provider) FetchTransactions(ctx context.Context, userID, bankID int32, externalAccountID string, since time.Time) ([]model.OpenBankingTransaction, error) {
	access, err := s.accessToken(ctx, userID, bankID)
	if err != nil {
		return nil, err
	}
	accountUID, categoryUID, err := accountAndCategory(externalAccountID)
	if err != nil {
		return nil, err
	}
	var r feedResponse
	if err := s.getJSON(ctx, fmt.Sprintf(feedURL, accountUID, categoryUID, since.UTC().Format(time.RFC3339)), access, &r); err != nil {
		return nil, err
	}
	out := make([]model.OpenBankingTransaction, 0, len(r.FeedItems))
	for _, raw := range r.FeedItems {
		var it feedItem
		if err := json.Unmarshal(raw, &it); err != nil {
			log.Printf("starling: skip unparsable feed item on account %s: %v", externalAccountID, err)
			continue
		}
		switch it.Status {
		case statusDeclined, statusUpcoming, statusUpcomingCancelled:
			// Starling feed item statuses that must not surface as suggestions: declined
			// transactions never happened, and upcoming ones are scheduled in the future.
			continue
		}
		ts, _ := time.Parse(time.RFC3339, it.TransactionTime)
		amount := it.Amount.MinorUnits * moneyutil.NanosPerCent
		if it.Direction == "OUT" {
			amount = -amount
		}
		out = append(out, model.NewOpenBankingTransaction(it.FeedItemUID, ts, it.CounterPartyName, amount, raw))
	}
	return out, nil
}
