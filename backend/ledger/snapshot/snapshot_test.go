package snapshot

import (
	"testing"
	"time"

	"prosper/model"
)

// expense is a minimal recorded expense; CurrentVersion only depends on
// a transaction's id, supersedes link and void flag.
func expense(id int32) model.Transaction {
	return model.Transaction{ID: id, Timestamp: time.Now(), Type: model.TransactionExpense}
}

func supersedes(t model.Transaction, id int32) model.Transaction {
	t.SupersedesID = &id
	return t
}

func snap(txs ...model.Transaction) *Ledger {
	return New(txs, nil, nil, nil, nil, nil, nil, nil)
}

func TestCurrentVersionReturnsTheTransactionItself(t *testing.T) {
	got, ok := snap(expense(10)).CurrentVersion(10)
	if !ok || got.ID != 10 {
		t.Fatalf("CurrentVersion(10) = %v, %v; want transaction 10", got, ok)
	}
}

func TestCurrentVersionFollowsSupersedesChainToHead(t *testing.T) {
	s := snap(expense(10), supersedes(expense(11), 10), supersedes(expense(12), 11))
	got, ok := s.CurrentVersion(10)
	if !ok || got.ID != 12 {
		t.Fatalf("CurrentVersion(10) = %v, %v; want the chain head 12", got, ok)
	}
}

func TestCurrentVersionVoidedHeadIsUnrecorded(t *testing.T) {
	voided := expense(10)
	voided.IsVoid = true
	if got, ok := snap(voided).CurrentVersion(10); ok {
		t.Errorf("CurrentVersion(10) = %v, ok; want a voided transaction to be unrecorded", got)
	}
}

func TestCurrentVersionUnknownIDIsUnrecorded(t *testing.T) {
	if _, ok := snap().CurrentVersion(999); ok {
		t.Errorf("CurrentVersion of an unknown id reported ok")
	}
}

func TestCurrentVersionStopsOnSupersedesCycle(t *testing.T) {
	// A cycle has no live head; the walk must terminate rather than loop.
	s := snap(supersedes(expense(10), 11), supersedes(expense(11), 10))
	if _, ok := s.CurrentVersion(10); ok {
		t.Errorf("CurrentVersion on a supersedes cycle reported ok")
	}
}
