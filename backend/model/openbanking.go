package model

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"time"
)

// maxDescriptionLen bounds a stored description to the column width; the
// full text is preserved in the raw payload.
const maxDescriptionLen = 512

// OpenBankingTransaction is a transaction fetched from an open banking provider.
type OpenBankingTransaction struct {
	ID                    int32           `db:"id"`
	UserID                int32           `db:"userId"`
	ExternalTransactionID string          `db:"externalTransactionId"`
	Timestamp             time.Time       `db:"timestamp"`
	Description           string          `db:"description"`
	SignedAmountNanos     int64           `db:"signedAmountNanos"`
	Raw                   json.RawMessage `db:"raw"`
	RawHash               string          `db:"rawHash"`
	CreatedAt             time.Time       `db:"createdAt"`
	UpdatedAt             time.Time       `db:"updatedAt"`
}

// NewOpenBankingTransaction builds a transaction from the fields a
// provider reads off the raw feed, filling in what the provider cannot
// supply directly: the description is capped to the column width and the
// dedup hash is derived from the raw payload.
func NewOpenBankingTransaction(externalTransactionID string, timestamp time.Time, description string, signedAmountNanos int64, raw json.RawMessage) OpenBankingTransaction {
	sum := sha256.Sum256(raw)
	return OpenBankingTransaction{
		ExternalTransactionID: externalTransactionID,
		Timestamp:             timestamp,
		Description:           truncateRunes(description, maxDescriptionLen),
		SignedAmountNanos:     signedAmountNanos,
		Raw:                   raw,
		RawHash:               hex.EncodeToString(sum[:]),
	}
}

// AccountTransactions groups one internal account's stored open-banking transactions.
type AccountTransactions struct {
	InternalAccountID int32
	Transactions      []OpenBankingTransaction
}

// truncateRunes caps s to max runes, so a multi-byte character is never
// split (which the utf8mb4 column would reject).
func truncateRunes(s string, max int) string {
	r := []rune(s)
	if len(r) <= max {
		return s
	}
	return string(r[:max])
}

// FetchTrigger identifies what initiated a fetch.
type FetchTrigger string

const (
	FetchTriggerScheduled FetchTrigger = "SCHEDULED"
	FetchTriggerManual    FetchTrigger = "MANUAL"
)

// FetchStatus is the outcome of a fetch.
type FetchStatus string

const (
	FetchStatusSuccess FetchStatus = "SUCCESS"
	FetchStatusError   FetchStatus = "ERROR"
)

// OpenBankingFetch represents completed fetch attempt for a (user, account).
type OpenBankingFetch struct {
	ID                int32          `db:"id"`
	UserID            int32          `db:"userId"`
	InternalAccountID int32          `db:"internalAccountId"`
	Provider          string         `db:"provider"`
	Trigger           string         `db:"trigger"`
	Status            string         `db:"status"`
	Error             sql.NullString `db:"error"`
	TxCount           int32          `db:"txCount"`
	// BalanceNanos is the account balance the fetch read, in the account's
	// native currency. Valid only on a successful fetch that read a balance.
	BalanceNanos sql.NullInt64 `db:"balanceNanos"`
	StartedAt    time.Time     `db:"startedAt"`
	FinishedAt   time.Time     `db:"finishedAt"`
}

// OpenBankingTransactionFetchLink links a fetch to a transaction it returned.
type OpenBankingTransactionFetchLink struct {
	UserID        int32 `db:"userId"`
	FetchID       int32 `db:"fetchId"`
	TransactionID int32 `db:"openBankingTransactionId"`
}

// OpenBankingMapping is a row of ExternalAccountMapping linking an internal
// account to its external account at a bank's provider.
type OpenBankingMapping struct {
	UserID            int32     `db:"userId"`
	InternalAccountID int32     `db:"internalAccountId"`
	ExternalAccountID string    `db:"externalAccountId"`
	BankID            int32     `db:"bankId"`
	CreatedAt         time.Time `db:"createdAt"`
	UpdatedAt         time.Time `db:"updatedAt"`
}

// OpenBankingToken is the shared shape of the per-provider token tables
// (TrueLayerToken, GoCardlessToken, StarlingToken).
type OpenBankingToken struct {
	ID                int32     `db:"id"`
	UserID            int32     `db:"userId"`
	BankID            int32     `db:"bankId"`
	Access            string    `db:"access"`
	AccessValidUntil  time.Time `db:"accessValidUntil"`
	Refresh           string    `db:"refresh"`
	RefreshValidUntil time.Time `db:"refreshValidUntil"`
	CreatedAt         time.Time `db:"createdAt"`
	UpdatedAt         time.Time `db:"updatedAt"`
}

// GoCardlessRequisition used for GoCardless authorization flow.
type GoCardlessRequisition struct {
	ID            string    `db:"id"`
	RequisitionID string    `db:"requisitionId"`
	InstitutionID string    `db:"institutionId"`
	UserID        int32     `db:"userId"`
	BankID        int32     `db:"bankId"`
	Completed     bool      `db:"completed"`
	WasReconnect  bool      `db:"wasReconnect"`
	CreatedAt     time.Time `db:"createdAt"`
	UpdatedAt     time.Time `db:"updatedAt"`
}
