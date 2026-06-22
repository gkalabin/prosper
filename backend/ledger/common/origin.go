package common

import (
	prosperv1 "prosper/gen/prosper/v1"
	"prosper/model"
)

// originKindToModel maps each transport origin kind to the enum value stored for it.
var originKindToModel = map[prosperv1.OriginKind]model.SourceOriginKind{
	prosperv1.OriginKind_ORIGIN_KIND_OPEN_BANKING: model.OriginOpenBanking,
}

// OriginKindToModel converts a transport origin kind to its stored
// model value. ok is false for kinds that name no known source.
func OriginKindToModel(k prosperv1.OriginKind) (kind model.SourceOriginKind, ok bool) {
	kind, ok = originKindToModel[k]
	return kind, ok
}
