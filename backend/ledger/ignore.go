package ledger

import (
	"context"
	"errors"

	"prosper/ledger/common"
	"prosper/model"
	"prosper/userdb"
)

// InsertIgnoredOrigins appends one row per origin to the append-only
// IgnoredDraftOrigin log: active=true ignores the origin, active=false
// cancels a previous ignore.
func InsertIgnoredOrigins(ctx context.Context, db *userdb.DB, userID int32, origins []common.OriginKey, active bool) error {
	if len(origins) == 0 {
		return errors.New("at least one origin is required")
	}
	for _, o := range origins {
		row := model.IgnoredDraftOrigin{
			OriginKind: o.Kind,
			OriginKey:  o.Key,
			Active:     active,
		}
		if _, err := db.NamedExecForUser(ctx, userID,
			`INSERT INTO IgnoredDraftOrigin
			  ( userId,  originKind,  originKey,  active) VALUES
			  (:userId, :originKind, :originKey, :active)`, row); err != nil {
			return err
		}
	}
	return nil
}
