package suggest

import (
	"context"
	"testing"
	"time"

	prosperv1 "prosper/gen/prosper/v1"
	"prosper/model"
)

// fakeBank serves a fixed StoredTransactions response.
type fakeBank struct {
	accounts []model.AccountTransactions
}

func (f *fakeBank) StoredTransactions(_ context.Context, _ int32) ([]model.AccountTransactions, error) {
	return f.accounts, nil
}

func bankTx(externalID string, ts time.Time, description string, signedAmountNanos int64) model.OpenBankingTransaction {
	return model.OpenBankingTransaction{
		ExternalTransactionID: externalID,
		Timestamp:             ts,
		Description:           description,
		SignedAmountNanos:     signedAmountNanos,
	}
}

func draftsFor(t *testing.T, accounts ...model.AccountTransactions) []*prosperv1.TransactionDraft {
	t.Helper()
	src := NewOpenBankingSource(&fakeBank{accounts: accounts})
	drafts, err := src.Propose(context.Background(), 1)
	if err != nil {
		t.Fatalf("Propose() error: %v", err)
	}
	return drafts
}

func TestOpenBankingWithdrawalDraft(t *testing.T) {
	ts := day(0)
	drafts := draftsFor(t, model.AccountTransactions{
		InternalAccountID: bankAccountChecking,
		Transactions:      []model.OpenBankingTransaction{bankTx("w1", ts, "ZETTLE *STARBU", -4_500_000_000)},
	})
	if len(drafts) != 1 {
		t.Fatalf("got %d drafts, want 1", len(drafts))
	}
	d := drafts[0]
	if len(d.Origins) != 1 || d.Origins[0].Key != "w1" {
		t.Errorf("draft origins = %v", d.Origins)
	}
	if ft, _ := top(d.FormType); ft.GetValue() != prosperv1.FormType_FORM_TYPE_EXPENSE {
		t.Errorf("form type = %v, want EXPENSE", ft.GetValue())
	}
	if a, _ := top(d.Amount); a.GetValueNanos() != 4_500_000_000 {
		t.Errorf("amount = %d, want absolute value", a.GetValueNanos())
	}
	if acc, _ := top(d.AccountFromId); acc.GetValue() != bankAccountChecking {
		t.Errorf("account = %d, want %d", acc.GetValue(), bankAccountChecking)
	}
	if v, _ := top(d.Vendor); v.GetValue() != "ZETTLE *STARBU" {
		t.Errorf("vendor = %q, want the raw string", v.GetValue())
	}
	if v := d.Vendor[0]; v.Confidence != confidenceWeak {
		t.Errorf("raw vendor confidence = %d, want %d", v.Confidence, confidenceWeak)
	}
	if len(d.Payer) != 0 {
		t.Errorf("withdrawal proposed a payer: %v", d.Payer)
	}
}

func TestOpenBankingDepositDraft(t *testing.T) {
	drafts := draftsFor(t, model.AccountTransactions{
		InternalAccountID: bankAccountChecking,
		Transactions:      []model.OpenBankingTransaction{bankTx("d1", day(0), "ACME PAYROLL", 7_000_000_000)},
	})
	d := drafts[0]
	if ft, _ := top(d.FormType); ft.GetValue() != prosperv1.FormType_FORM_TYPE_INCOME {
		t.Errorf("form type = %v, want INCOME", ft.GetValue())
	}
	if acc, _ := top(d.AccountToId); acc.GetValue() != bankAccountChecking {
		t.Errorf("receiving account = %d, want %d", acc.GetValue(), bankAccountChecking)
	}
	if len(d.AccountFromId) != 0 {
		t.Errorf("deposit proposed a deducted-from account: %v", d.AccountFromId)
	}
	if p, _ := top(d.Payer); p.GetValue() != "ACME PAYROLL" {
		t.Errorf("payer = %q, want the raw string", p.GetValue())
	}
	if len(d.Vendor) != 0 {
		t.Errorf("deposit proposed a vendor: %v", d.Vendor)
	}
}

func TestOpenBankingSkipsMalformedTransactions(t *testing.T) {
	drafts := draftsFor(t, model.AccountTransactions{
		InternalAccountID: bankAccountChecking,
		Transactions: []model.OpenBankingTransaction{
			bankTx("zero", day(0), "zero amount", 0),
			bankTx("ok", day(0), "fine", -100),
		},
	})
	if len(drafts) != 1 || drafts[0].Origins[0].Key != "ok" {
		t.Errorf("got %d drafts, want only the well-formed one", len(drafts))
	}
}

func TestOpenBankingPairsTransfer(t *testing.T) {
	withdrawalTime := day(0)
	drafts := draftsFor(t,
		model.AccountTransactions{
			InternalAccountID: bankAccountChecking,
			Transactions:      []model.OpenBankingTransaction{bankTx("w1", withdrawalTime, "To savings", -100_000_000_000)},
		},
		model.AccountTransactions{
			InternalAccountID: bankAccountSavings,
			Transactions:      []model.OpenBankingTransaction{bankTx("d1", withdrawalTime.Add(30*time.Minute), "From checking", 100_000_000_000)},
		},
	)
	if len(drafts) != 1 {
		t.Fatalf("got %d drafts, want one transfer", len(drafts))
	}
	d := drafts[0]
	if ft, _ := top(d.FormType); ft.GetValue() != prosperv1.FormType_FORM_TYPE_TRANSFER {
		t.Fatalf("form type = %v, want TRANSFER", ft.GetValue())
	}
	if len(d.Origins) != 2 || d.Origins[0].Key != "w1" || d.Origins[1].Key != "d1" {
		t.Errorf("transfer origins = %v, want withdrawal then deposit", d.Origins)
	}
	if from, _ := top(d.AccountFromId); from.GetValue() != bankAccountChecking {
		t.Errorf("from account = %d, want %d", from.GetValue(), bankAccountChecking)
	}
	if to, _ := top(d.AccountToId); to.GetValue() != bankAccountSavings {
		t.Errorf("to account = %d, want %d", to.GetValue(), bankAccountSavings)
	}
	if ts, _ := top(d.Timestamp); !ts.Value.AsTime().Equal(withdrawalTime) {
		t.Errorf("timestamp = %v, want the withdrawal's %v", ts.Value.AsTime(), withdrawalTime)
	}
	if desc, _ := top(d.Description); desc.GetValue() != "To savings" {
		t.Errorf("description = %q, want the withdrawal's raw string", desc.GetValue())
	}
}
