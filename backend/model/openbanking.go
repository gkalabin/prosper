package model

import "time"

// OpenBankingMapping joins ExternalAccountMapping with BankAccount so
// providers can be selected per (internal account, bank).
type OpenBankingMapping struct {
	UserID            int32     `db:"userId"`
	InternalAccountID int32     `db:"internalAccountId"`
	ExternalAccountID string    `db:"externalAccountId"`
	BankID            int32     `db:"bankId"`
	CreatedAt         time.Time `db:"createdAt"`
	UpdatedAt         time.Time `db:"updatedAt"`
}

// OpenBankingToken is the shared shape of the per-provider token tables
// (TrueLayerToken, NordigenToken, StarlingToken).
type OpenBankingToken struct {
	ID                string    `db:"id"`
	UserID            int32     `db:"userId"`
	BankID            int32     `db:"bankId"`
	Access            string    `db:"access"`
	AccessValidUntil  time.Time `db:"accessValidUntil"`
	Refresh           string    `db:"refresh"`
	RefreshValidUntil time.Time `db:"refreshValidUntil"`
	CreatedAt         time.Time `db:"createdAt"`
	UpdatedAt         time.Time `db:"updatedAt"`
}

// NordigenRequisition used for Nordigen authorization flow.
type NordigenRequisition struct {
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
