package suggest

import (
	"cmp"
	"slices"
	"time"
)

// Two legs of one transfer rarely carry the same timestamp: money is
// usually taken before it is deposited (allow a generous window for
// bank delays), but bank clocks are not precise either, so a small
// window of deposits happening before withdrawals is allowed too.
const (
	transferWithdrawalLag = 2 * time.Hour
	transferDepositLead   = time.Minute
)

// transferPair is a withdrawal and a deposit describing one transfer
// between the user's accounts.
type transferPair struct {
	withdrawal, deposit singleLeg
}

// pairTransfers finds (withdrawal, deposit) pairs describing a single
// transfer: equal amounts on different accounts close in time.
// Unpaired legs are returned as-is.
func pairTransfers(legs []singleLeg) ([]transferPair, []singleLeg) {
	withdrawalsByAmount := make(map[int64][]singleLeg)
	for _, l := range legs {
		if l.isWithdrawal() {
			amount := l.absoluteAmountNanos()
			withdrawalsByAmount[amount] = append(withdrawalsByAmount[amount], l)
		}
	}

	var candidates []transferPair
	for _, deposit := range legs {
		if !deposit.isDeposit() {
			continue
		}
		var withdrawals []singleLeg
		for _, withdrawal := range withdrawalsByAmount[deposit.absoluteAmountNanos()] {
			if withdrawal.internalAccountID != deposit.internalAccountID &&
				closeInTime(deposit, withdrawal) {
				withdrawals = append(withdrawals, withdrawal)
			}
		}
		if len(withdrawals) == 0 {
			continue
		}
		// Prefer the withdrawal closest before the deposit.
		slices.SortStableFunc(withdrawals, func(a, b singleLeg) int {
			return cmp.Compare(deposit.timestamp.Sub(a.timestamp), deposit.timestamp.Sub(b.timestamp))
		})
		candidates = append(candidates, transferPair{withdrawal: withdrawals[0], deposit: deposit})
	}

	// Pick the pairs with the closest timestamps; each leg is used once.
	slices.SortStableFunc(candidates, func(a, b transferPair) int {
		return cmp.Compare(legGap(a), legGap(b))
	})
	var transfers []transferPair
	used := make(map[string]bool)
	for _, p := range candidates {
		if used[p.withdrawal.externalTransactionID] || used[p.deposit.externalTransactionID] {
			continue
		}
		used[p.withdrawal.externalTransactionID] = true
		used[p.deposit.externalTransactionID] = true
		transfers = append(transfers, p)
	}

	var singles []singleLeg
	for _, l := range legs {
		if !used[l.externalTransactionID] {
			singles = append(singles, l)
		}
	}
	return transfers, singles
}

// legGap is the absolute time distance between a pair's legs.
func legGap(p transferPair) time.Duration {
	return p.withdrawal.timestamp.Sub(p.deposit.timestamp).Abs()
}

// closeInTime reports whether a deposit and a withdrawal are close
// enough in time to be the two legs of one transfer.
func closeInTime(deposit, withdrawal singleLeg) bool {
	if !withdrawal.timestamp.After(deposit.timestamp) {
		return deposit.timestamp.Sub(withdrawal.timestamp) < transferWithdrawalLag
	}
	return withdrawal.timestamp.Sub(deposit.timestamp) < transferDepositLead
}
