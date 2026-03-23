package starling

import (
	"context"
	"fmt"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"

	prosperv1 "prosper/gen/prosper/v1"
	"prosper/moneyutil"
)

const feedURL = "https://api.starlingbank.com/api/v2/feed/account/%s/category/%s?changesSince=%s"

type feedResponse struct {
	FeedItems []struct {
		FeedItemUID string `json:"feedItemUid"`
		Direction   string `json:"direction"`
		Amount      struct {
			MinorUnits int64 `json:"minorUnits"`
		} `json:"amount"`
		TransactionTime  string `json:"transactionTime"`
		CounterPartyName string `json:"counterPartyName"`
	} `json:"feedItems"`
}

func (s *Provider) FetchTransactions(ctx context.Context, userID, bankID int32, externalAccountID string, since time.Time) ([]*prosperv1.OpenBankingTransaction, error) {
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
	out := make([]*prosperv1.OpenBankingTransaction, 0, len(r.FeedItems))
	for _, it := range r.FeedItems {
		ts, _ := time.Parse(time.RFC3339, it.TransactionTime)
		amount := it.Amount.MinorUnits * moneyutil.NanosPerCent
		if it.Direction == "OUT" {
			amount = -amount
		}
		out = append(out, &prosperv1.OpenBankingTransaction{
			ExternalTransactionId: it.FeedItemUID,
			Timestamp:             timestamppb.New(ts),
			Description:           it.CounterPartyName,
			SignedAmountNanos:     amount,
		})
	}
	return out, nil
}
