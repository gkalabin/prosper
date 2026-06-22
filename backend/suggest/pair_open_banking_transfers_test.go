package suggest

import (
	"reflect"
	"testing"
	"time"
)

// leg builds a singleLeg for pairing tests; a positive amount is a
// deposit, a negative one a withdrawal.
func leg(externalID string, account int32, ts time.Time, signedAmountNanos int64) singleLeg {
	return singleLeg{
		externalTransactionID: externalID,
		timestamp:             ts,
		signedAmountNanos:     signedAmountNanos,
		internalAccountID:     account,
	}
}

// pairIDs returns the (withdrawal, deposit) external ids of each pair.
func pairIDs(pairs []transferPair) [][2]string {
	ids := make([][2]string, 0, len(pairs))
	for _, p := range pairs {
		ids = append(ids, [2]string{p.withdrawal.externalTransactionID, p.deposit.externalTransactionID})
	}
	return ids
}

// singleIDs returns the external ids of the unpaired legs.
func singleIDs(legs []singleLeg) []string {
	ids := make([]string, 0, len(legs))
	for _, l := range legs {
		ids = append(ids, l.externalTransactionID)
	}
	return ids
}

func TestPairTransfersMatchesWithdrawalAndDeposit(t *testing.T) {
	legs := []singleLeg{
		leg("w", 1, dayZero, -5_000_000_000),
		leg("d", 2, dayZero.Add(time.Minute), 5_000_000_000),
	}

	transfers, singles := pairTransfers(legs)

	if got, want := pairIDs(transfers), [][2]string{{"w", "d"}}; !reflect.DeepEqual(got, want) {
		t.Errorf("pairs = %v, want %v", got, want)
	}
	if len(singles) != 0 {
		t.Errorf("singles = %v, want none", singleIDs(singles))
	}
}

func TestPairTransfersNeedsDistinctAccounts(t *testing.T) {
	legs := []singleLeg{
		leg("w", 1, dayZero, -5_000_000_000),
		leg("d", 1, dayZero.Add(time.Minute), 5_000_000_000),
	}

	transfers, singles := pairTransfers(legs)

	if len(transfers) != 0 {
		t.Errorf("pairs = %v, want none", pairIDs(transfers))
	}
	if got, want := singleIDs(singles), []string{"w", "d"}; !reflect.DeepEqual(got, want) {
		t.Errorf("singles = %v, want %v", got, want)
	}
}

func TestPairTransfersNeedsEqualAmounts(t *testing.T) {
	legs := []singleLeg{
		leg("w", 1, dayZero, -5_000_000_000),
		leg("d", 2, dayZero.Add(time.Minute), 6_000_000_000),
	}

	transfers, _ := pairTransfers(legs)

	if len(transfers) != 0 {
		t.Errorf("pairs = %v, want none", pairIDs(transfers))
	}
}

func TestPairTransfersRespectsTimeWindows(t *testing.T) {
	tests := []struct {
		name       string
		depositGap time.Duration // deposit timestamp relative to the withdrawal
		wantPaired bool
	}{
		{"withdrawal just before deposit", time.Minute, true},
		{"withdrawal within lag window", transferWithdrawalLag - time.Minute, true},
		{"withdrawal beyond lag window", transferWithdrawalLag + time.Minute, false},
		{"deposit just before withdrawal", -(transferDepositLead - time.Second), true},
		{"deposit beyond lead window", -(transferDepositLead + time.Second), false},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			legs := []singleLeg{
				leg("w", 1, dayZero, -5_000_000_000),
				leg("d", 2, dayZero.Add(tc.depositGap), 5_000_000_000),
			}
			transfers, _ := pairTransfers(legs)
			if paired := len(transfers) == 1; paired != tc.wantPaired {
				t.Errorf("paired = %v, want %v", paired, tc.wantPaired)
			}
		})
	}
}

func TestPairTransfersClosestPairWinsAndLegsAreUsedOnce(t *testing.T) {
	// Two withdrawals and one deposit of the same amount. The deposit
	// pairs with the closest withdrawal; the other is left unpaired.
	legs := []singleLeg{
		leg("w_far", 1, dayZero, -5_000_000_000),
		leg("w_near", 2, dayZero.Add(30*time.Minute), -5_000_000_000),
		leg("d", 3, dayZero.Add(31*time.Minute), 5_000_000_000),
	}

	transfers, singles := pairTransfers(legs)

	if got, want := pairIDs(transfers), [][2]string{{"w_near", "d"}}; !reflect.DeepEqual(got, want) {
		t.Errorf("pairs = %v, want %v", got, want)
	}
	if got, want := singleIDs(singles), []string{"w_far"}; !reflect.DeepEqual(got, want) {
		t.Errorf("singles = %v, want %v", got, want)
	}
}
