package auth

import (
	"context"
	"strings"

	"github.com/jmoiron/sqlx"

	"prosper/model"
)

// defaultDisplayCurrency is the seed currency stamped onto a new
// user's DisplaySettings row. Users can change it from the settings
// page.
const defaultDisplayCurrency = "USD"

// systemLedgerAccountTypes are the bookkeeping accounts every user
// needs before they can record their first transaction. They are
// global to the user and surfaced via the LedgerAccount table with
// a `SYSTEM:` name prefix and the matching type.
var systemLedgerAccountTypes = []model.LedgerAccountType{
	model.LedgerAccountExpense,
	model.LedgerAccountIncome,
	model.LedgerAccountEquity,
	model.LedgerAccountCurrencyExchange,
}

// defaultCategoryPaths are the seed category tree inserted for every
// new user. Each entry is `>`-separated; parents are auto-created
// before children.
var defaultCategoryPaths = []string{
	"Income > Salary",
	"Income > Investment",
	"Income > Other",
	"Housing > Rent & Mortgage",
	"Housing > Utilities",
	"Housing > Services",
	"Food > Groceries",
	"Food > Eating Out",
	"Transport > Public Transport",
	"Transport > Car",
	"Transport > Taxi",
	"Shopping > Clothing",
	"Shopping > Electronics",
	"Shopping > Home",
	"Health & Wellness",
	"Entertainment",
	"Travel",
	"Education",
	"Financial > Taxes",
	"Financial > Fees",
	"Transfer",
}

// seedNewUser inserts the rows that every user is expected to have at
// registration time — DisplaySettings, the starter category tree, and
// the system ledger accounts (EXPENSE / INCOME / EQUITY /
// CURRENCY_EXCHANGE). All inserts run in the supplied transaction so
// user creation is atomic with the seeding.
func seedNewUser(ctx context.Context, tx *sqlx.Tx, userID int64) error {
	if _, err := tx.NamedExecContext(ctx,
		`INSERT INTO DisplaySettings
		        ( userId,  displayCurrencyCode,  excludeCategoryIdsInStats)
		 VALUES (:userId, :displayCurrencyCode, :excludeCategoryIdsInStats)`,
		model.DisplaySettings{
			UserID:                    int32(userID),
			DisplayCurrencyCode:       defaultDisplayCurrency,
			ExcludeCategoryIdsInStats: "",
		}); err != nil {
		return err
	}
	if err := seedCategories(ctx, tx, userID); err != nil {
		return err
	}
	accounts := make([]model.LedgerAccount, len(systemLedgerAccountTypes))
	for i, t := range systemLedgerAccountTypes {
		accounts[i] = model.LedgerAccount{
			UserID: int32(userID),
			Name:   "SYSTEM:" + string(t),
			Type:   t,
		}
	}
	_, err := tx.NamedExecContext(ctx,
		`INSERT INTO LedgerAccount
		        ( userId,  name,  type)
		 VALUES (:userId, :name, :type)`,
		accounts)
	return err
}

// categoryPathSeparator is the literal separating segments in
// defaultCategoryPaths entries (e.g. "Food > Groceries").
const categoryPathSeparator = ">"

// noParentIndex is the parentInsertIndex value for top-level entries.
const noParentIndex = -1

// categoryInsert describes one row to insert into the Category table:
// the leaf segment as the name, plus the index of the parent's entry
// earlier in the same plan slice so the executor can substitute the
// parent id once the row has been written. Top-level entries use
// noParentIndex.
type categoryInsert struct {
	name              string
	parentInsertIndex int
}

// planCategoryInserts walks the >-separated category paths and
// produces a flat insert list in the order rows must be written. Each
// entry's parentInsertIndex points back to an earlier entry in the
// slice, or noParentIndex when the entry has no parent.
func planCategoryInserts(paths []string) []categoryInsert {
	indexByName := map[string]int{}
	out := make([]categoryInsert, 0, len(paths))
	for _, path := range paths {
		segments := splitAndTrim(path, categoryPathSeparator)
		for i := range segments {
			fullName := strings.Join(segments[:i+1], categoryPathSeparator)
			if _, ok := indexByName[fullName]; ok {
				continue
			}
			parentInsertIndex := noParentIndex
			if i > 0 {
				parentName := strings.Join(segments[:i], categoryPathSeparator)
				if idx, ok := indexByName[parentName]; ok {
					parentInsertIndex = idx
				}
			}
			indexByName[fullName] = len(out)
			out = append(out, categoryInsert{
				name:              segments[i],
				parentInsertIndex: parentInsertIndex,
			})
		}
	}
	return out
}

// seedCategories inserts the default category tree.
func seedCategories(ctx context.Context, tx *sqlx.Tx, userID int64) error {
	plan := planCategoryInserts(defaultCategoryPaths)
	insertedIDs := make([]int64, 0, len(plan))
	for _, c := range plan {
		var parentID *int32
		if c.parentInsertIndex != noParentIndex {
			pid := int32(insertedIDs[c.parentInsertIndex])
			parentID = &pid
		}
		res, err := tx.NamedExecContext(ctx,
			`INSERT INTO Category
			        ( userId,  name,  parentCategoryId)
			 VALUES (:userId, :name, :parentCategoryId)`,
			model.Category{
				UserID:           int32(userID),
				Name:             c.name,
				ParentCategoryID: parentID,
			})
		if err != nil {
			return err
		}
		id, err := res.LastInsertId()
		if err != nil {
			return err
		}
		insertedIDs = append(insertedIDs, id)
	}
	return nil
}

func splitAndTrim(s, sep string) []string {
	parts := strings.Split(s, sep)
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		out = append(out, strings.TrimSpace(p))
	}
	return out
}
