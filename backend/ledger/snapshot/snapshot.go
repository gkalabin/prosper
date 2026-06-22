// Package snapshot is a read-only, in-memory view of one user's ledger:
// the live transactions and the rows the suggestion pipeline reads to
// recall and learn from what the user has already recorded.
package snapshot

import (
	"context"

	"prosper/model"
	"prosper/userdb"
)

// Ledger is a read-only view of one user's ledger.
type Ledger struct {
	// Transactions excludes voided and superseded ones.
	Transactions []model.Transaction
	// transactionByID indexes transactions by id.
	transactionByID map[int32]*model.Transaction
	// supersededBy maps a transaction id to the id of the transaction that replaced it.
	supersededBy map[int32]int32

	LinesByTransaction  map[int32][]model.EntryLine
	SplitsByTransaction map[int32][]model.SplitContext
	LedgerAccountByID   map[int32]model.LedgerAccount
	Links               []model.TransactionLink
	// Origins link recorded transactions to the source events they
	// were recorded from.
	Origins []model.TransactionOrigin
	// OpenBankingDescriptionByExternalID maps a bank transaction's external id
	// to the raw text the bank reported for it.
	OpenBankingDescriptionByExternalID map[string]string
	BankAccounts                       []model.BankAccount
}

// OpenBankingDescription is the raw text reported for one open banking
// transaction, paired with its external id so it can be joined back to
// drafts and origins.
type OpenBankingDescription struct {
	ExternalID  string `db:"externalTransactionId"`
	Description string `db:"description"`
}

// Load reads the user's ledger into a snapshot.
func Load(ctx context.Context, db *userdb.DB, userID int32) (*Ledger, error) {
	var txs []model.Transaction
	if err := db.SelectForUser(ctx, &txs, userID,
		`SELECT * FROM Transaction WHERE userId = :userId`); err != nil {
		return nil, err
	}

	var lines []model.EntryLine
	if err := db.SelectForUser(ctx, &lines, userID,
		`SELECT * FROM EntryLine WHERE userId = :userId`); err != nil {
		return nil, err
	}

	var splits []model.SplitContext
	if err := db.SelectForUser(ctx, &splits, userID,
		`SELECT * FROM SplitContext WHERE userId = :userId`); err != nil {
		return nil, err
	}

	var ledgerAccounts []model.LedgerAccount
	if err := db.SelectForUser(ctx, &ledgerAccounts, userID,
		`SELECT * FROM LedgerAccount WHERE userId = :userId`); err != nil {
		return nil, err
	}

	var links []model.TransactionLink
	if err := db.SelectForUser(ctx, &links, userID,
		`SELECT * FROM TransactionLink WHERE userId = :userId`); err != nil {
		return nil, err
	}

	var origins []model.TransactionOrigin
	if err := db.SelectForUser(ctx, &origins, userID,
		`SELECT * FROM TransactionOrigin WHERE userId = :userId`); err != nil {
		return nil, err
	}

	var descriptions []OpenBankingDescription
	if err := db.SelectForUser(ctx, &descriptions, userID,
		`SELECT externalTransactionId, description FROM OpenBankingTransaction WHERE userId = :userId`); err != nil {
		return nil, err
	}

	var bankAccounts []model.BankAccount
	if err := db.SelectForUser(ctx, &bankAccounts, userID,
		`SELECT * FROM BankAccount WHERE userId = :userId`); err != nil {
		return nil, err
	}

	return New(txs, lines, splits, ledgerAccounts, links, origins, descriptions, bankAccounts), nil
}

// New assembles a snapshot from the user's already-loaded ledger rows.
func New(
	txs []model.Transaction,
	lines []model.EntryLine,
	splits []model.SplitContext,
	ledgerAccounts []model.LedgerAccount,
	links []model.TransactionLink,
	origins []model.TransactionOrigin,
	openBankingDescriptions []OpenBankingDescription,
	bankAccounts []model.BankAccount,
) *Ledger {
	s := &Ledger{
		transactionByID:                    make(map[int32]*model.Transaction),
		supersededBy:                       make(map[int32]int32),
		LinesByTransaction:                 make(map[int32][]model.EntryLine),
		SplitsByTransaction:                make(map[int32][]model.SplitContext),
		LedgerAccountByID:                  make(map[int32]model.LedgerAccount),
		Links:                              links,
		Origins:                            origins,
		OpenBankingDescriptionByExternalID: make(map[string]string, len(openBankingDescriptions)),
		BankAccounts:                       bankAccounts,
	}
	for _, d := range openBankingDescriptions {
		s.OpenBankingDescriptionByExternalID[d.ExternalID] = d.Description
	}
	for _, t := range txs {
		if t.SupersedesID != nil {
			s.supersededBy[*t.SupersedesID] = t.ID
		}
	}
	for _, t := range txs {
		if t.IsVoid {
			continue
		}
		if _, superseded := s.supersededBy[t.ID]; superseded {
			continue
		}
		s.Transactions = append(s.Transactions, t)
	}
	for i := range s.Transactions {
		s.transactionByID[s.Transactions[i].ID] = &s.Transactions[i]
	}
	for _, l := range lines {
		s.LinesByTransaction[l.TransactionID] = append(s.LinesByTransaction[l.TransactionID], l)
	}
	for _, sp := range splits {
		s.SplitsByTransaction[sp.TransactionID] = append(s.SplitsByTransaction[sp.TransactionID], sp)
	}
	for _, a := range ledgerAccounts {
		s.LedgerAccountByID[a.ID] = a
	}
	return s
}

// CurrentVersion follows the supersedes chain from id to the current
// transaction recording the same event; ok is false when the chain
// ends in a void or unknown transaction.
func (s *Ledger) CurrentVersion(id int32) (*model.Transaction, bool) {
	seen := make(map[int32]bool)
	for !seen[id] {
		seen[id] = true
		if next, ok := s.supersededBy[id]; ok {
			id = next
			continue
		}
		t, ok := s.transactionByID[id]
		return t, ok
	}
	return nil, false
}
