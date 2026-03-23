// Package userdb wraps sqlx.DB so every per-user query has to declare
// its scoping. The wrapper rejects any query that omits the user id
// filter, so a caller that forgets to filter by user gets an error at
// runtime instead of leaking another user's rows.
//
// Queries that legitimately span users (e.g. fetching the global Stock
// table) must be issued via Raw().
package userdb

import (
	"context"
	"database/sql"
	"fmt"
	"maps"
	"reflect"
	"strings"

	"github.com/jmoiron/sqlx"
)

// userIDPlaceholder is the named parameter every per-user query must
// bind. The DB methods inject it so callers cannot forget.
const userIDPlaceholder = ":userId"

// userIDColumn is the db tag on the userId column. NamedExecForUser
// finds the matching struct field by this tag and injects the user id
// before binding.
const userIDColumn = "userId"

// queryer is the read-write subset of sqlx that both *sqlx.DB and
// *sqlx.Tx implement. It is the only surface the validated helpers
// need from the underlying driver.
type queryer interface {
	Rebind(string) string
	SelectContext(ctx context.Context, dest any, query string, args ...any) error
	GetContext(ctx context.Context, dest any, query string, args ...any) error
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
	NamedExecContext(ctx context.Context, query string, arg any) (sql.Result, error)
}

// DB is the connection-pool-level wrapper.
type DB struct{ db *sqlx.DB }

func New(db *sqlx.DB) *DB { return &DB{db: db} }

// Raw returns the underlying *sqlx.DB. Use only for queries that do
// not scope by user (e.g. global tables like Stock). Each call site
// should be reviewed for legitimacy.
func (u *DB) Raw() *sqlx.DB { return u.db }

func (u *DB) SelectForUser(ctx context.Context, dest any, userID int32, query string, args ...map[string]any) error {
	return selectForUser(ctx, u.db, userID, dest, query, args)
}

func (u *DB) GetForUser(ctx context.Context, dest any, userID int32, query string, args ...map[string]any) error {
	return getForUser(ctx, u.db, userID, dest, query, args)
}

func (u *DB) ExecForUser(ctx context.Context, userID int32, query string, args ...map[string]any) (sql.Result, error) {
	return execForUser(ctx, u.db, userID, query, args)
}

// NamedExecForUser runs a named-parameter statement against a struct
// row, requiring the query reference :userId. The user id is set on a
// copy of the struct's userId-tagged field before binding, so the
// caller doesn't have to set it themselves.
func (u *DB) NamedExecForUser(ctx context.Context, userID int32, query string, arg any) (sql.Result, error) {
	return namedExecForUser(ctx, u.db, userID, query, arg)
}

// BeginTx opens a sqlx transaction and wraps it so the per-user
// helpers can be used inside the transaction too.
func (u *DB) BeginTx(ctx context.Context) (*Tx, error) {
	tx, err := u.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	return &Tx{tx: tx}, nil
}

// Tx is a user-scoped transaction handle.
type Tx struct{ tx *sqlx.Tx }

func (t *Tx) Commit() error   { return t.tx.Commit() }
func (t *Tx) Rollback() error { return t.tx.Rollback() }

// Raw returns the wrapped *sqlx.Tx. Use only for queries that legitimately
// span users (e.g. global tables); per-user queries should go through
// the scoped helpers.
func (t *Tx) Raw() *sqlx.Tx { return t.tx }

func (t *Tx) SelectForUser(ctx context.Context, dest any, userID int32, query string, args ...map[string]any) error {
	return selectForUser(ctx, t.tx, userID, dest, query, args)
}

func (t *Tx) GetForUser(ctx context.Context, dest any, userID int32, query string, args ...map[string]any) error {
	return getForUser(ctx, t.tx, userID, dest, query, args)
}

func (t *Tx) ExecForUser(ctx context.Context, userID int32, query string, args ...map[string]any) (sql.Result, error) {
	return execForUser(ctx, t.tx, userID, query, args)
}

// NamedExecForUser is the transaction-scoped counterpart of
// DB.NamedExecForUser.
func (t *Tx) NamedExecForUser(ctx context.Context, userID int32, query string, arg any) (sql.Result, error) {
	return namedExecForUser(ctx, t.tx, userID, query, arg)
}

func selectForUser(ctx context.Context, q queryer, userID int32, dest any, query string, args []map[string]any) error {
	bound, params, err := bindUser(q, userID, query, args)
	if err != nil {
		return err
	}
	return q.SelectContext(ctx, dest, bound, params...)
}

func getForUser(ctx context.Context, q queryer, userID int32, dest any, query string, args []map[string]any) error {
	bound, params, err := bindUser(q, userID, query, args)
	if err != nil {
		return err
	}
	return q.GetContext(ctx, dest, bound, params...)
}

func execForUser(ctx context.Context, q queryer, userID int32, query string, args []map[string]any) (sql.Result, error) {
	bound, params, err := bindUser(q, userID, query, args)
	if err != nil {
		return nil, err
	}
	return q.ExecContext(ctx, bound, params...)
}

func namedExecForUser(ctx context.Context, q queryer, userID int32, query string, arg any) (sql.Result, error) {
	if !strings.Contains(query, userIDPlaceholder) {
		return nil, fmt.Errorf("userdb: query missing %q placeholder: %s",
			userIDPlaceholder, firstLine(query))
	}
	scoped, err := withUserID(arg, userID)
	if err != nil {
		return nil, err
	}
	return q.NamedExecContext(ctx, query, scoped)
}

// withUserID returns a copy of arg with the userId-tagged field (or
// "userId" map key) set to userID. Slice args yield a fresh slice with
// the field set on every element, so callers can route batch inserts
// through the same per-user wrapper.
func withUserID(arg any, userID int32) (any, error) {
	if m, ok := arg.(map[string]any); ok {
		out := make(map[string]any, len(m)+1)
		maps.Copy(out, m)
		out[userIDColumn] = userID
		return out, nil
	}
	v := reflect.ValueOf(arg)
	if v.Kind() == reflect.Pointer {
		v = v.Elem()
	}
	switch v.Kind() {
	case reflect.Struct:
		out := reflect.New(v.Type()).Elem()
		out.Set(v)
		field, ok := userIDFieldIndex(v.Type())
		if !ok {
			return nil, fmt.Errorf("userdb: NamedExecForUser arg %s has no field tagged db:%q", v.Type(), userIDColumn)
		}
		out.Field(field).SetInt(int64(userID))
		return out.Interface(), nil
	case reflect.Slice:
		elem := v.Type().Elem()
		if elem.Kind() != reflect.Struct {
			return nil, fmt.Errorf("userdb: NamedExecForUser slice element must be struct, got %s", elem)
		}
		field, ok := userIDFieldIndex(elem)
		if !ok {
			return nil, fmt.Errorf("userdb: NamedExecForUser slice element %s has no field tagged db:%q", elem, userIDColumn)
		}
		out := reflect.MakeSlice(v.Type(), v.Len(), v.Len())
		reflect.Copy(out, v)
		for i := 0; i < out.Len(); i++ {
			out.Index(i).Field(field).SetInt(int64(userID))
		}
		return out.Interface(), nil
	}
	return nil, fmt.Errorf("userdb: NamedExecForUser arg must be struct, slice, or map, got %T", arg)
}

func userIDFieldIndex(t reflect.Type) (int, bool) {
	for i := 0; i < t.NumField(); i++ {
		if t.Field(i).Tag.Get("db") == userIDColumn {
			return i, true
		}
	}
	return 0, false
}

func bindUser(q queryer, userID int32, query string, args []map[string]any) (string, []any, error) {
	if !strings.Contains(query, userIDPlaceholder) {
		return "", nil, fmt.Errorf("userdb: query missing %q placeholder: %s",
			userIDPlaceholder, firstLine(query))
	}
	merged := map[string]any{userIDColumn: userID}
	for _, a := range args {
		for k, v := range a {
			if k == userIDColumn {
				return "", nil, fmt.Errorf("userdb: args may not override userId")
			}
			merged[k] = v
		}
	}
	bound, params, err := sqlx.Named(query, merged)
	if err != nil {
		return "", nil, err
	}
	return q.Rebind(bound), params, nil
}

func firstLine(s string) string {
	first, _, _ := strings.Cut(s, "\n")
	return strings.TrimSpace(first)
}
