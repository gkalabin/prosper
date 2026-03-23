package txform

import (
	"context"

	"github.com/jmoiron/sqlx"

	"prosper/model"
	"prosper/userdb"
)

// writeTags creates Tag rows for any name not already present and
// links each name's id to transactionID.
func writeTags(ctx context.Context, tx *userdb.Tx, userID int32, transactionID int64, names []string) error {
	ids, err := getOrCreateTagIDs(ctx, tx, userID, names)
	if err != nil {
		return err
	}
	if len(ids) == 0 {
		return nil
	}
	links := make([]model.TagTransactionLink, len(ids))
	for i, tagID := range ids {
		links[i] = model.TagTransactionLink{TagID: tagID, TransactionID: int32(transactionID)}
	}
	_, err = tx.Raw().NamedExecContext(ctx,
		`INSERT INTO _TagToTransaction
		        ( A,  B)
		 VALUES (:A, :B)`,
		links)
	return err
}

// getOrCreateTagIDs returns the IDs of the given tag names, creating
// new tag rows for names not yet present.
func getOrCreateTagIDs(ctx context.Context, tx *userdb.Tx, userID int32, names []string) ([]int32, error) {
	if len(names) == 0 {
		return nil, nil
	}
	q, args, err := sqlx.In(`SELECT id, name FROM Tag WHERE userId = ? AND name IN (?)`, userID, names)
	if err != nil {
		return nil, err
	}
	var existing []model.Tag
	if err := tx.Raw().SelectContext(ctx, &existing, tx.Raw().Rebind(q), args...); err != nil {
		return nil, err
	}
	existingByName := map[string]int32{}
	for _, r := range existing {
		existingByName[r.Name] = r.ID
	}
	out := make([]int32, 0, len(names))
	for _, n := range names {
		if id, ok := existingByName[n]; ok {
			out = append(out, id)
			continue
		}
		row := model.Tag{UserID: userID, Name: n}
		res, err := tx.NamedExecForUser(ctx, userID,
			`INSERT INTO Tag
			        ( userId,  name)
			 VALUES (:userId, :name)`,
			row)
		if err != nil {
			return nil, err
		}
		id, err := res.LastInsertId()
		if err != nil {
			return nil, err
		}
		out = append(out, int32(id))
	}
	return out, nil
}
