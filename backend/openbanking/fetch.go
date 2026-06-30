package openbanking

import (
	"context"
	"database/sql"
	"log"
	"time"

	"github.com/jmoiron/sqlx"

	"prosper/model"
	"prosper/userdb"
)

// fetchAccount fetches transactions and the balance for one mapped account,
// stores them, and records a OpenBankingFetch row. The metadata row and the
// transactions are written together in one database transaction. An error from
// the provider's transaction feed is recorded as a failed fetch and returned to
// the caller; a balance the same fetch cannot read is logged and left absent.
func (s *Service) fetchAccount(ctx context.Context, userID int32, p Provider, m model.OpenBankingMapping, trigger model.FetchTrigger) error {
	started := time.Now().UTC()
	since := started.AddDate(0, -transactionsLookbackMonths, 0)
	fetched, fetchErr := p.FetchTransactions(ctx, userID, m.BankID, m.ExternalAccountID, since)
	status, errMsg := model.FetchStatusSuccess, ""
	var balance sql.NullInt64
	if fetchErr != nil {
		status, errMsg = model.FetchStatusError, fetchErr.Error()
		log.Printf("openbanking: fetch bank=%d account=%d: %v", m.BankID, m.InternalAccountID, fetchErr)
	} else if b, balErr := p.FetchBalance(ctx, userID, m.BankID, m.ExternalAccountID); balErr != nil {
		log.Printf("openbanking: fetch balance bank=%d account=%d: %v", m.BankID, m.InternalAccountID, balErr)
	} else {
		balance = sql.NullInt64{Int64: b, Valid: true}
	}
	if err := s.recordFetch(ctx, userID, m.InternalAccountID, p.Kind().String(), trigger, status, errMsg, balance, started, fetched); err != nil {
		return err
	}
	if status == model.FetchStatusError {
		return fetchErr
	}
	log.Printf("openbanking: fetch succeeded bank=%d account=%d trigger=%s txCount=%d", m.BankID, m.InternalAccountID, trigger, len(fetched))
	return nil
}

// recordFetch writes the OpenBankingFetch row, the fetched transactions,
// and the links between them in one db transaction.
func (s *Service) recordFetch(ctx context.Context, userID, internalAccountID int32, provider string, trigger model.FetchTrigger, status model.FetchStatus, errMsg string, balance sql.NullInt64, started time.Time, fetched []model.OpenBankingTransaction) error {
	tx, err := s.db.BeginTx(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	fetch := model.OpenBankingFetch{
		InternalAccountID: internalAccountID,
		Provider:          provider,
		Trigger:           string(trigger),
		Status:            string(status),
		TxCount:           int32(len(fetched)),
		BalanceNanos:      balance,
		StartedAt:         started,
		FinishedAt:        time.Now().UTC(),
	}
	if errMsg != "" {
		fetch.Error = sql.NullString{String: errMsg, Valid: true}
	}
	res, err := tx.NamedExecForUser(ctx, userID, `INSERT INTO OpenBankingFetch
        ( userId,  internalAccountId,  provider,  `+"`trigger`"+`,  status,  error,  txCount,  balanceNanos,  startedAt,  finishedAt)
 VALUES (:userId, :internalAccountId, :provider,     :trigger,     :status, :error, :txCount, :balanceNanos, :startedAt, :finishedAt)`, fetch)
	if err != nil {
		return err
	}
	fetchID, err := res.LastInsertId()
	if err != nil {
		return err
	}
	if err := recordTransactions(ctx, tx, userID, int32(fetchID), fetched); err != nil {
		return err
	}
	return tx.Commit()
}

func recordTransactions(ctx context.Context, tx *userdb.Tx, userID, fetchID int32, fetched []model.OpenBankingTransaction) error {
	if len(fetched) == 0 {
		return nil
	}
	hashes := make([]string, 0, len(fetched))
	for _, ft := range fetched {
		hashes = append(hashes, ft.RawHash)
	}
	// INSERT IGNORE deduplicates on (userId, rawHash): a transaction whose
	// json an earlier fetch already stored keeps its existing row.
	if _, err := tx.NamedExecForUser(ctx, userID, `INSERT IGNORE INTO OpenBankingTransaction
        ( userId,  externalTransactionId,  timestamp,  description,  signedAmountNanos,  raw,  rawHash)
 VALUES (:userId, :externalTransactionId, :timestamp, :description, :signedAmountNanos, :raw, :rawHash)`, fetched); err != nil {
		return err
	}
	idByHash, err := fetchTransactionIDsByHash(ctx, tx, userID, hashes)
	if err != nil {
		return err
	}
	links := make([]model.OpenBankingTransactionFetchLink, 0, len(idByHash))
	for _, id := range idByHash {
		links = append(links, model.OpenBankingTransactionFetchLink{FetchID: fetchID, TransactionID: id})
	}
	_, err = tx.NamedExecForUser(ctx, userID, `INSERT INTO OpenBankingFetchTransaction
        ( userId,  fetchId,  openBankingTransactionId)
 VALUES (:userId, :fetchId, :openBankingTransactionId)`, links)
	return err
}

// fetchTransactionIDsByHash maps each raw json hash to its stored transaction id.
func fetchTransactionIDsByHash(ctx context.Context, tx *userdb.Tx, userID int32, hashes []string) (map[string]int32, error) {
	q, args, err := sqlx.In(`SELECT id, rawHash FROM OpenBankingTransaction WHERE userId = ? AND rawHash IN (?)`, userID, hashes)
	if err != nil {
		return nil, err
	}
	var rows []struct {
		ID      int32  `db:"id"`
		RawHash string `db:"rawHash"`
	}
	if err := tx.Raw().SelectContext(ctx, &rows, tx.Raw().Rebind(q), args...); err != nil {
		return nil, err
	}
	byHash := make(map[string]int32, len(rows))
	for _, r := range rows {
		byHash[r.RawHash] = r.ID
	}
	return byHash, nil
}
