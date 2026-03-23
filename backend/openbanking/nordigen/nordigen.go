// Package nordigen implements the open-banking Provider against the
// GoCardless Bank Account Data API.
package nordigen

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

// apiBase is the root of every Nordigen URL. Per-endpoint URL
// constants live in the file that uses them.
const apiBase = "https://bankaccountdata.gocardless.com/api/v2"

// dateOnlyFormat matches Nordigen's "YYYY-MM-DD" wire format.
const dateOnlyFormat = "2006-01-02"

// Provider implements openbanking.Provider against the GoCardless Bank
// Account Data API.
type Provider struct {
	db         *userdb.DB
	secretID   string
	secretKey  string
	httpClient *http.Client

	appTokenMu     sync.Mutex
	appToken       string
	appTokenExpiry time.Time
}

func New(db *userdb.DB, secretID, secretKey string) *Provider {
	return &Provider{
		db:         db,
		secretID:   secretID,
		secretKey:  secretKey,
		httpClient: httpx.NewClient(),
	}
}

func (*Provider) Kind() prosperv1.Provider { return prosperv1.Provider_PROVIDER_NORDIGEN }

// ReconnectURL returns the in-app path the frontend reconnect flow
// should redirect to. The Next page at
// /config/open-banking/nordigen/connect owns the actual flow; we just
// hand it the institutionId from the most recent requisition.
func (n *Provider) ReconnectURL(ctx context.Context, userID, bankID int32) (string, error) {
	institutionID, err := n.LastInstitutionID(ctx, userID, bankID)
	if err != nil {
		return "", err
	}
	return reconnectPath(bankID, institutionID), nil
}

func reconnectPath(bankID int32, institutionID string) string {
	return fmt.Sprintf("/config/open-banking/nordigen/connect?bankId=%d&institutionId=%s", bankID, institutionID)
}
