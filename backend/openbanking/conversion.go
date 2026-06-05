package openbanking

import (
	"google.golang.org/protobuf/types/known/timestamppb"

	prosperv1 "prosper/gen/prosper/v1"
	"prosper/model"
)

func protoOpenBankingTransaction(t model.OpenBankingTransaction) *prosperv1.OpenBankingTransaction {
	return &prosperv1.OpenBankingTransaction{
		ExternalTransactionId: t.ExternalTransactionID,
		Timestamp:             timestamppb.New(t.Timestamp),
		Description:           t.Description,
		SignedAmountNanos:     t.SignedAmountNanos,
	}
}
