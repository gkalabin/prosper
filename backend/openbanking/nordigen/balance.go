package nordigen

import (
	"context"
	"fmt"

	"prosper/moneyutil"
)

const balancesURL = apiBase + "/accounts/%s/balances/"

// usableBalanceTypes lists the Nordigen balance types we accept, in
// order of preference. The API returns a heterogeneous list and we
// pick the first one of these we encounter.
var usableBalanceTypes = []string{"interimAvailable", "expected"}

// balancesResponse mirrors the /accounts/{id}/balances payload.
type balancesResponse struct {
	Balances []struct {
		BalanceAmount struct {
			Amount string `json:"amount"`
		} `json:"balanceAmount"`
		BalanceType string `json:"balanceType"`
	} `json:"balances"`
}

// FetchBalance returns the latest usable balance for the external
// account, in nanos.
func (n *Provider) FetchBalance(ctx context.Context, userID, bankID int32, externalAccountID string) (int64, error) {
	access, err := n.accessToken(ctx, userID, bankID)
	if err != nil {
		return 0, err
	}
	var r balancesResponse
	if err := n.getJSON(ctx, fmt.Sprintf(balancesURL, externalAccountID), access, &r); err != nil {
		return 0, err
	}
	for _, t := range usableBalanceTypes {
		for _, b := range r.Balances {
			if b.BalanceType != t {
				continue
			}
			amount, err := moneyutil.ParseDecimalToNanos(b.BalanceAmount.Amount)
			if err != nil {
				return 0, fmt.Errorf("parse balance %q: %w", b.BalanceAmount.Amount, err)
			}
			return amount, nil
		}
	}
	return 0, fmt.Errorf("nordigen: no usable balance for account %s among %v", externalAccountID, usableBalanceTypes)
}
