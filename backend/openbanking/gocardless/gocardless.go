// Package gocardless implements the open-banking Provider against the
// GoCardless Bank Account Data API.
package gocardless

import (
	"context"
	"fmt"
	"net/http"
	"sync"
	"time"

	prosperv1 "prosper/gen/prosper/v1"
	"prosper/openbanking/httpx"
	"prosper/userdb"
)

// apiBase is the root of every GoCardless URL. Per-endpoint URL
// constants live in the file that uses them.
const apiBase = "https://bankaccountdata.gocardless.com/api/v2"

// dateOnlyFormat matches GoCardless's "YYYY-MM-DD" wire format.
const dateOnlyFormat = "2006-01-02"

// connectedPath is the path the browser lands on after authorizing on GoCardless.
const connectedPath = "/api/open-banking/gocardless/connected"

// Provider implements openbanking.Provider against the GoCardless Bank
// Account Data API.
type Provider struct {
	db        *userdb.DB
	secretID  string
	secretKey string
	// publicAppURL is the origin the user's browser reaches the Next
	// frontend at. Used to derive the connection redirect URI without
	// asking the caller for it.
	publicAppURL string
	httpClient   *http.Client

	appTokenMu     sync.Mutex
	appToken       string
	appTokenExpiry time.Time
}

func New(db *userdb.DB, secretID, secretKey, publicAppURL string) *Provider {
	return &Provider{
		db:           db,
		secretID:     secretID,
		secretKey:    secretKey,
		publicAppURL: publicAppURL,
		httpClient:   httpx.NewClient(),
	}
}

// redirectURI is the absolute URL the browser lands on after the user
// authorizes the app on GoCardless's side.
func (n *Provider) redirectURI() string {
	return n.publicAppURL + connectedPath
}

func (*Provider) Kind() prosperv1.Provider { return prosperv1.Provider_PROVIDER_GOCARDLESS }

// ReconnectURL returns the in-app path the frontend reconnect flow
// should redirect to. The Next page at
// /config/open-banking/gocardless/connect owns the actual flow; we just
// hand it the institutionId from the most recent requisition.
func (n *Provider) ReconnectURL(ctx context.Context, userID, bankID int32) (string, error) {
	institutionID, err := n.LastInstitutionID(ctx, userID, bankID)
	if err != nil {
		return "", err
	}
	return reconnectPath(bankID, institutionID), nil
}

func reconnectPath(bankID int32, institutionID string) string {
	return fmt.Sprintf("/config/open-banking/gocardless/connect?bankId=%d&institutionId=%s", bankID, institutionID)
}
