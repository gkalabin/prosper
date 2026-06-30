package suggest

import (
	"context"
	"log"
	"slices"
	"strings"
	"time"

	prosperv1 "prosper/gen/prosper/v1"
	"prosper/model"
)

// OpenBankingStore reads the user's stored open-banking transactions, grouped by mapped account.
type OpenBankingStore interface {
	StoredTransactions(ctx context.Context, userID int32) ([]model.AccountTransactions, error)
}

// OpenBankingSource proposes one observed draft per stored open-banking
// transaction, combining each matching withdrawal+deposit pair into a
// single transfer draft carrying both legs' origins.
type OpenBankingSource struct {
	store OpenBankingStore
}

func NewOpenBankingSource(store OpenBankingStore) *OpenBankingSource {
	return &OpenBankingSource{store: store}
}

// singleLeg is one stored open-banking transaction on a single account.
type singleLeg struct {
	externalTransactionID string
	description           string
	timestamp             time.Time
	signedAmountNanos     int64
	internalAccountID     int32
}

func (l singleLeg) isDeposit() bool { return l.signedAmountNanos > 0 }

func (l singleLeg) isWithdrawal() bool { return l.signedAmountNanos < 0 }

// absoluteAmountNanos is the leg's amount magnitude (always non-negative).
func (l singleLeg) absoluteAmountNanos() int64 {
	if l.signedAmountNanos < 0 {
		return -l.signedAmountNanos
	}
	return l.signedAmountNanos
}

func (s *OpenBankingSource) Propose(ctx context.Context, userID int32) ([]*prosperv1.TransactionDraft, error) {
	accounts, err := s.store.StoredTransactions(ctx, userID)
	if err != nil {
		return nil, err
	}
	var legs []singleLeg
	for _, acc := range accounts {
		for _, t := range acc.Transactions {
			if t.SignedAmountNanos == 0 {
				log.Printf("suggest: skipping open-banking transaction %q on account %d: zero amount",
					t.ExternalTransactionID, acc.InternalAccountID)
				continue
			}
			legs = append(legs, singleLeg{
				externalTransactionID: t.ExternalTransactionID,
				description:           t.Description,
				timestamp:             t.Timestamp,
				signedAmountNanos:     t.SignedAmountNanos,
				internalAccountID:     acc.InternalAccountID,
			})
		}
	}
	// The account order in the stored data is unspecified; sort so
	// transfer pairing and the resulting drafts are deterministic.
	slices.SortFunc(legs, func(a, b singleLeg) int {
		if c := b.timestamp.Compare(a.timestamp); c != 0 {
			return c
		}
		return strings.Compare(a.externalTransactionID, b.externalTransactionID)
	})
	transfers, singles := pairTransfers(legs)
	drafts := make([]*prosperv1.TransactionDraft, 0, len(transfers)+len(singles))
	for _, p := range transfers {
		drafts = append(drafts, transferDraft(p))
	}
	for _, l := range singles {
		drafts = append(drafts, legDraft(l))
	}
	return drafts, nil
}

func legOrigin(l singleLeg) *prosperv1.OriginKey {
	return &prosperv1.OriginKey{Kind: OriginOpenBanking, Key: l.externalTransactionID}
}

// legDraft turns an unpaired open-banking transaction into an observed
// draft. The feed is certain of its amount, account and timestamp, but
// its raw description string is only weak evidence of the name the user
// will record.
func legDraft(l singleLeg) *prosperv1.TransactionDraft {
	d := &prosperv1.TransactionDraft{Origins: []*prosperv1.OriginKey{legOrigin(l)}}
	addTimestamp(&d.Timestamp, l.timestamp, confidenceObserved)
	addMoney(&d.Amount, l.absoluteAmountNanos(), confidenceObserved)
	if l.isDeposit() {
		addFormType(&d.FormType, prosperv1.FormType_FORM_TYPE_INCOME, confidenceObserved)
		addID(&d.AccountToId, l.internalAccountID, confidenceObserved)
		addString(&d.Payer, l.description, confidenceWeak)
	} else {
		addFormType(&d.FormType, prosperv1.FormType_FORM_TYPE_EXPENSE, confidenceObserved)
		addID(&d.AccountFromId, l.internalAccountID, confidenceObserved)
		addString(&d.Vendor, l.description, confidenceWeak)
	}
	return d
}

func transferDraft(p transferPair) *prosperv1.TransactionDraft {
	d := &prosperv1.TransactionDraft{Origins: []*prosperv1.OriginKey{legOrigin(p.withdrawal), legOrigin(p.deposit)}}
	addFormType(&d.FormType, prosperv1.FormType_FORM_TYPE_TRANSFER, confidenceObserved)
	addTimestamp(&d.Timestamp, p.withdrawal.timestamp, confidenceObserved)
	addMoney(&d.Amount, p.withdrawal.absoluteAmountNanos(), confidenceObserved)
	addMoney(&d.AmountReceived, p.deposit.absoluteAmountNanos(), confidenceObserved)
	addID(&d.AccountFromId, p.withdrawal.internalAccountID, confidenceObserved)
	addID(&d.AccountToId, p.deposit.internalAccountID, confidenceObserved)
	addString(&d.Description, p.withdrawal.description, confidenceWeak)
	return d
}
