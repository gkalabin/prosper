package suggest

import (
	"reflect"
	"testing"

	prosperv1 "prosper/gen/prosper/v1"
)

func TestRecallAttachesRecordedTransaction(t *testing.T) {
	f := newFixture()
	f.addExpense(10, day(-1), "Starbucks", 7, ledgerAccountChecking, 4_500_000_000)
	f.addOpenBankingOrigin("w1", "ZETTLE *STARBU", 10)

	d := &prosperv1.TransactionDraft{Origins: []*prosperv1.OriginKey{{Kind: OriginOpenBanking, Key: "w1"}}}
	recallFromSnapshot(f.snapshot(), []*prosperv1.TransactionDraft{d})

	if !reflect.DeepEqual(d.RecordedTransactionIds, []int32{10}) {
		t.Fatalf("Recorded = %v, want [10]", d.RecordedTransactionIds)
	}
}

func TestRecallLeavesUnrecordedDraftsAlone(t *testing.T) {
	f := newFixture()
	f.addExpense(10, day(-1), "Starbucks", 7, ledgerAccountChecking, 4_500_000_000)
	f.addOpenBankingOrigin("other", "OTHER", 10)

	d := &prosperv1.TransactionDraft{Origins: []*prosperv1.OriginKey{{Kind: OriginOpenBanking, Key: "w1"}}}
	recallFromSnapshot(f.snapshot(), []*prosperv1.TransactionDraft{d})
	if len(d.RecordedTransactionIds) != 0 {
		t.Errorf("unrecorded draft has Recorded = %v, want empty", d.RecordedTransactionIds)
	}
}

func TestRecallFollowsSupersedesChainToCurrentVersion(t *testing.T) {
	f := newFixture()
	f.addExpense(10, day(-1), "Old name", 7, ledgerAccountChecking, 100)
	f.addExpense(11, day(-1), "New name", 8, ledgerAccountChecking, 100)
	supersedes := int32(10)
	f.txs[1].SupersedesID = &supersedes
	f.addOpenBankingOrigin("w1", "RAW", 10)

	d := &prosperv1.TransactionDraft{Origins: []*prosperv1.OriginKey{{Kind: OriginOpenBanking, Key: "w1"}}}
	recallFromSnapshot(f.snapshot(), []*prosperv1.TransactionDraft{d})
	if !reflect.DeepEqual(d.RecordedTransactionIds, []int32{11}) {
		t.Fatalf("Recorded = %v, want the current version [11]", d.RecordedTransactionIds)
	}
}

func TestRecallIgnoresVoidedRecordings(t *testing.T) {
	f := newFixture()
	f.addExpense(10, day(-1), "Deleted", 7, ledgerAccountChecking, 100)
	f.txs[0].IsVoid = true
	f.addOpenBankingOrigin("w1", "RAW", 10)

	d := &prosperv1.TransactionDraft{Origins: []*prosperv1.OriginKey{{Kind: OriginOpenBanking, Key: "w1"}}}
	recallFromSnapshot(f.snapshot(), []*prosperv1.TransactionDraft{d})
	if len(d.RecordedTransactionIds) != 0 {
		t.Errorf("Recorded = %v, want a voided recording to unrecord the event", d.RecordedTransactionIds)
	}
}
