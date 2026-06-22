package model

import (
	"errors"
	"time"
)

// ErrInvalidUnit signals a row that has neither or both of
// currencyCode and the (stockExchange, stockTicker) pair set.
var ErrInvalidUnit = errors.New("must have exactly one of currencyCode or stock (exchange, ticker)")

// LedgerAccountType is the typed enum stored in LedgerAccount.type.
// Values must match the SQL enum strings.
type LedgerAccountType string

const (
	LedgerAccountAsset            LedgerAccountType = "ASSET"
	LedgerAccountExpense          LedgerAccountType = "EXPENSE"
	LedgerAccountIncome           LedgerAccountType = "INCOME"
	LedgerAccountEquity           LedgerAccountType = "EQUITY"
	LedgerAccountCurrencyExchange LedgerAccountType = "CURRENCY_EXCHANGE"
	LedgerAccountReceivable       LedgerAccountType = "RECEIVABLE"
)

// TransactionType is the typed enum stored in Transaction.type.
type TransactionType string

const (
	TransactionExpense           TransactionType = "EXPENSE"
	TransactionIncome            TransactionType = "INCOME"
	TransactionTransfer          TransactionType = "TRANSFER"
	TransactionThirdPartyExpense TransactionType = "THIRD_PARTY_EXPENSE"
	TransactionOpeningBalance    TransactionType = "OPENING_BALANCE"
)

// TransactionLinkType is the typed enum stored in TransactionLink.linkType.
type TransactionLinkType string

const (
	LinkRefund       TransactionLinkType = "REFUND"
	LinkDebtSettling TransactionLinkType = "DEBT_SETTLING"
)

type Bank struct {
	ID           int32     `db:"id"`
	UserID       int32     `db:"userId"`
	Name         string    `db:"name"`
	DisplayOrder int32     `db:"displayOrder"`
	CreatedAt    time.Time `db:"createdAt"`
	UpdatedAt    time.Time `db:"updatedAt"`
}

type BankAccount struct {
	ID                  int32     `db:"id"`
	UserID              int32     `db:"userId"`
	Name                string    `db:"name"`
	BankID              int32     `db:"bankId"`
	CurrencyCode        *string   `db:"currencyCode"`
	StockExchange       *string   `db:"stockExchange"`
	StockTicker         *string   `db:"stockTicker"`
	Joint               bool      `db:"joint"`
	Archived            bool      `db:"archived"`
	DisplayOrder        int32     `db:"displayOrder"`
	InitialBalanceNanos int64     `db:"initialBalanceNanos"`
	CreatedAt           time.Time `db:"createdAt"`
	UpdatedAt           time.Time `db:"updatedAt"`
}

// Unit returns the bank account's unit of value. Every BankAccount
// has exactly one of (CurrencyCode, stock pair) set; rows that violate
// the invariant are reported as an error.
func (b BankAccount) Unit() (Unit, error) {
	return NewUnit(b.CurrencyCode, b.StockExchange, b.StockTicker)
}

// Unit is the unit of value of a row: either a currency or a stock
// identified by its (exchange, ticker) pair.
type Unit struct {
	CurrencyCode  *string `db:"currencyCode"`
	StockExchange *string `db:"stockExchange"`
	StockTicker   *string `db:"stockTicker"`
}

// NewUnit builds a Unit from the columns, rejecting rows that set both
// a currency and a stock, or neither. The stock exchange and ticker
// must be set together.
func NewUnit(currencyCode, stockExchange, stockTicker *string) (Unit, error) {
	if (stockExchange != nil) != (stockTicker != nil) {
		return Unit{}, ErrInvalidUnit
	}
	if (currencyCode != nil) == (stockExchange != nil) {
		return Unit{}, ErrInvalidUnit
	}
	return Unit{CurrencyCode: currencyCode, StockExchange: stockExchange, StockTicker: stockTicker}, nil
}

// Matches reports whether two units are denominated in the same
// currency or the same stock.
func (u Unit) Matches(other Unit) bool {
	if u.CurrencyCode != nil && other.CurrencyCode != nil {
		return *u.CurrencyCode == *other.CurrencyCode
	}
	if u.StockExchange != nil && other.StockExchange != nil {
		return *u.StockExchange == *other.StockExchange && *u.StockTicker == *other.StockTicker
	}
	return false
}

type Stock struct {
	Name         string    `db:"name"`
	Exchange     string    `db:"exchange"`
	Ticker       string    `db:"ticker"`
	CurrencyCode string    `db:"currencyCode"`
	CreatedAt    time.Time `db:"createdAt"`
	UpdatedAt    time.Time `db:"updatedAt"`
}

type Category struct {
	ID               int32     `db:"id"`
	UserID           int32     `db:"userId"`
	Name             string    `db:"name"`
	ParentCategoryID *int32    `db:"parentCategoryId"`
	DisplayOrder     int32     `db:"displayOrder"`
	CreatedAt        time.Time `db:"createdAt"`
	UpdatedAt        time.Time `db:"updatedAt"`
}

type Tag struct {
	ID        int32     `db:"id"`
	UserID    int32     `db:"userId"`
	Name      string    `db:"name"`
	CreatedAt time.Time `db:"createdAt"`
	UpdatedAt time.Time `db:"updatedAt"`
}

type Trip struct {
	ID          int32      `db:"id"`
	UserID      int32      `db:"userId"`
	Name        string     `db:"name"`
	Country     *string    `db:"country"`
	City        *string    `db:"city"`
	Destination *string    `db:"destination"`
	Start       *time.Time `db:"start"`
	End         *time.Time `db:"end"`
	CreatedAt   time.Time  `db:"createdAt"`
	UpdatedAt   time.Time  `db:"updatedAt"`
}

type DisplaySettings struct {
	UserID                    int32     `db:"userId"`
	DisplayCurrencyCode       string    `db:"displayCurrencyCode"`
	ExcludeCategoryIdsInStats string    `db:"excludeCategoryIdsInStats"`
	CreatedAt                 time.Time `db:"createdAt"`
	UpdatedAt                 time.Time `db:"updatedAt"`
}

type ExchangeRate struct {
	ID               int32     `db:"id"`
	CurrencyCodeFrom string    `db:"currencyCodeFrom"`
	CurrencyCodeTo   string    `db:"currencyCodeTo"`
	RateTimestamp    time.Time `db:"rateTimestamp"`
	RateNanos        *int64    `db:"rateNanos"`
	FetchStatus      string    `db:"fetchStatus"`
	FetchedAt        time.Time `db:"fetchedAt"`
	CreatedAt        time.Time `db:"createdAt"`
	UpdatedAt        time.Time `db:"updatedAt"`
}

type StockQuote struct {
	ID             int32     `db:"id"`
	StockExchange  string    `db:"stockExchange"`
	StockTicker    string    `db:"stockTicker"`
	QuoteTimestamp time.Time `db:"quoteTimestamp"`
	ValueNanos     *int64    `db:"valueNanos"`
	FetchStatus    string    `db:"fetchStatus"`
	FetchedAt      time.Time `db:"fetchedAt"`
	CreatedAt      time.Time `db:"createdAt"`
	UpdatedAt      time.Time `db:"updatedAt"`
}

type User struct {
	ID        int32     `db:"id"`
	Login     string    `db:"login"`
	Password  string    `db:"password"`
	CreatedAt time.Time `db:"createdAt"`
	UpdatedAt time.Time `db:"updatedAt"`
}

type Session struct {
	ID        string    `db:"id"`
	UserID    int32     `db:"userId"`
	ExpiresAt time.Time `db:"expiresAt"`
}

type Transaction struct {
	ID           int32           `db:"id"`
	IID          int32           `db:"iid"`
	UserID       int32           `db:"userId"`
	Timestamp    time.Time       `db:"timestamp"`
	Note         string          `db:"note"`
	Type         TransactionType `db:"type"`
	Vendor       *string         `db:"vendor"`
	Payer        *string         `db:"payer"`
	CategoryID   *int32          `db:"categoryId"`
	TripID       *int32          `db:"tripId"`
	SupersedesID *int32          `db:"supersedesId"`
	IsVoid       bool            `db:"isVoid"`
	CreatedAt    time.Time       `db:"createdAt"`
	UpdatedAt    time.Time       `db:"updatedAt"`
}

type EntryLine struct {
	ID              int32     `db:"id"`
	UserID          int32     `db:"userId"`
	TransactionID   int32     `db:"transactionId"`
	LedgerAccountID int32     `db:"ledgerAccountId"`
	CurrencyCode    *string   `db:"currencyCode"`
	StockExchange   *string   `db:"stockExchange"`
	StockTicker     *string   `db:"stockTicker"`
	AmountNanos     int64     `db:"amountNanos"`
	CreatedAt       time.Time `db:"createdAt"`
	UpdatedAt       time.Time `db:"updatedAt"`
}

type SplitContext struct {
	ID                  int32     `db:"id"`
	UserID              int32     `db:"userId"`
	TransactionID       int32     `db:"transactionId"`
	CompanionName       string    `db:"companionName"`
	CompanionShareNanos int64     `db:"companionShareNanos"`
	CompanionPaidNanos  int64     `db:"companionPaidNanos"`
	CreatedAt           time.Time `db:"createdAt"`
	UpdatedAt           time.Time `db:"updatedAt"`
}

type TagTransactionLink struct {
	TagID         int32 `db:"tagId"`
	TransactionID int32 `db:"transactionId"`
}

type TransactionLink struct {
	ID                  int32               `db:"id"`
	UserID              int32               `db:"userId"`
	SourceTransactionID int32               `db:"sourceTransactionId"`
	LinkedTransactionID int32               `db:"linkedTransactionId"`
	LinkType            TransactionLinkType `db:"linkType"`
	CreatedAt           time.Time           `db:"createdAt"`
	UpdatedAt           time.Time           `db:"updatedAt"`
}

// SourceOriginKind is the typed enum stored in
// TransactionOrigin.originKind. It names the kind of external source
// a transaction was recorded from.
type SourceOriginKind string

const (
	OriginOpenBanking SourceOriginKind = "OPEN_BANKING"
)

// TransactionOrigin links a recorded transaction to the external
// source event it was recorded from. OriginKind and Key together
// identify that event; any further detail (e.g. a bank statement line)
// is recovered from the source by them.
type TransactionOrigin struct {
	SyntheticID           int32            `db:"syntheticId"`
	OriginKind            SourceOriginKind `db:"originKind"`
	Key                   string           `db:"originKey"`
	InternalTransactionID int32            `db:"internalTransactionId"`
	UserID                int32            `db:"userId"`
	CreatedAt             time.Time        `db:"createdAt"`
	UpdatedAt             time.Time        `db:"updatedAt"`
}

type LedgerAccount struct {
	ID            int32             `db:"id"`
	UserID        int32             `db:"userId"`
	Name          string            `db:"name"`
	Type          LedgerAccountType `db:"type"`
	BankAccountID *int32            `db:"bankAccountId"`
	CreatedAt     time.Time         `db:"createdAt"`
	UpdatedAt     time.Time         `db:"updatedAt"`
}
