package common

import (
	"errors"
	"fmt"

	prosperv1 "prosper/gen/prosper/v1"
	"prosper/model"
)

// originKindToModel maps each transport origin kind to the enum value stored for it.
var originKindToModel = map[prosperv1.OriginKind]model.SourceOriginKind{
	prosperv1.OriginKind_ORIGIN_KIND_OPEN_BANKING: model.OriginOpenBanking,
}

// OriginKey identifies an external source event:
// the kind of source it came from and its id within that source.
type OriginKey struct {
	Kind model.SourceOriginKind
	Key  string
}

// OriginKindToModel converts a transport origin kind to its stored
// model value. ok is false for kinds that name no known source.
func OriginKindToModel(k prosperv1.OriginKind) (kind model.SourceOriginKind, ok bool) {
	kind, ok = originKindToModel[k]
	return kind, ok
}

// OriginKeysFromProto converts transport origin keys to their stored form.
func OriginKeysFromProto(origins []*prosperv1.OriginKey) ([]OriginKey, error) {
	out := make([]OriginKey, 0, len(origins))
	for _, o := range origins {
		kind, ok := OriginKindToModel(o.Kind)
		if !ok {
			return nil, fmt.Errorf("unknown origin kind: %v", o.Kind)
		}
		if o.Key == "" {
			return nil, errors.New("origin key must not be empty")
		}
		out = append(out, OriginKey{Kind: kind, Key: o.Key})
	}
	return out, nil
}
