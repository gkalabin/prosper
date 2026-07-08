package suggest

import (
	"log"
	"slices"

	prosperv1 "prosper/gen/prosper/v1"
	"prosper/ledger/common"
	"prosper/ledger/snapshot"
)

// recallFromSnapshot fills each draft's Recorded with the live
// transactions already recorded from its origins, and marks drafts
// whose origins are ignored.
func recallFromSnapshot(snap *snapshot.Ledger, drafts []*prosperv1.TransactionDraft) {
	transactionsByOrigin := make(map[common.OriginKey][]int32)
	for _, o := range snap.Origins {
		key := common.OriginKey{Kind: o.OriginKind, Key: o.Key}
		transactionsByOrigin[key] = append(transactionsByOrigin[key], o.InternalTransactionID)
	}
	for _, d := range drafts {
		var recorded []int32
		for _, o := range d.Origins {
			kind, ok := common.OriginKindToModel(o.Kind)
			if !ok {
				log.Printf("suggest: skipping draft origin with unknown kind %v (key %q)", o.Kind, o.Key)
				continue
			}
			key := common.OriginKey{Kind: kind, Key: o.Key}
			for _, recordedID := range transactionsByOrigin[key] {
				current, ok := snap.CurrentVersion(recordedID)
				if !ok {
					// The recording was voided; the event is unrecorded again.
					continue
				}
				if !slices.Contains(recorded, current.ID) {
					recorded = append(recorded, current.ID)
				}
			}
			if snap.IgnoredOrigins[key] {
				d.Ignored = true
			}
		}
		slices.Sort(recorded)
		d.RecordedTransactionIds = recorded
	}
}
