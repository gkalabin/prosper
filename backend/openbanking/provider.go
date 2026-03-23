// Package openbanking talks to TrueLayer, Nordigen and Starling so the
// app can ingest open banking transaction feeds and account balances.
package openbanking

import (
	"context"
	"time"

	prosperv1 "prosper/gen/prosper/v1"
)

// Provider abstracts external open banking integrations.
// Implementations: TrueLayer, Nordigen, Starling.
type Provider interface {
	// Kind returns the proto enum identifying this provider.
	Kind() prosperv1.Provider

	// FetchTransactions returns transactions for the given external
	// account since the supplied timestamp.
	FetchTransactions(ctx context.Context, userID, bankID int32, externalAccountID string, since time.Time) ([]*prosperv1.OpenBankingTransaction, error)

	// FetchBalance returns the latest balance in the account's native
	// currency, expressed in nanos.
	FetchBalance(ctx context.Context, userID, bankID int32, externalAccountID string) (int64, error)

	// ConnectionExpiresAt returns the time the bank connection becomes
	// invalid. For surfacing expiry warnings to the user.
	ConnectionExpiresAt(ctx context.Context, userID, bankID int32) (time.Time, error)

	// ListExternalAccounts enumerates the external accounts the user
	// has authorised the app to see for this bank.
	ListExternalAccounts(ctx context.Context, userID, bankID int32) ([]*prosperv1.ExternalAccount, error)

	// ReconnectURL returns the URL the user should be redirected to in
	// order to re-establish a stale or revoked bank connection.
	ReconnectURL(ctx context.Context, userID, bankID int32) (string, error)

	// Disconnect tears down the provider connection for a bank: best-
	// effort revocation against the provider followed by deletion of
	// stored credentials.
	Disconnect(ctx context.Context, userID, bankID int32) error
}
