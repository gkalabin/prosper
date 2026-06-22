package suggest

import (
	"log"
	"slices"

	prosperv1 "prosper/gen/prosper/v1"
	"prosper/ledger/common"
	"prosper/ledger/snapshot"
	"prosper/model"
)

// OriginKey identifies an external source event:
// the kind of source it came from and its id within that source.
type OriginKey struct {
	kind model.SourceOriginKind
	key  string
}

// recallFromSnapshot fills each draft's Recorded with the live
// transactions already recorded from its origins.
func recallFromSnapshot(snap *snapshot.Ledger, drafts []*prosperv1.TransactionDraft) {
	transactionsByOrigin := make(map[OriginKey][]int32)
	for _, o := range snap.Origins {
		key := OriginKey{kind: o.OriginKind, key: o.Key}
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
			key := OriginKey{kind: kind, key: o.Key}
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
		}
		slices.Sort(recorded)
		d.RecordedTransactionIds = recorded
	}
}
