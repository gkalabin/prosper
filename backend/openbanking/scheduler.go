package openbanking

import (
	"context"
	"database/sql"
	"errors"
	"log"
	"sync"
	"time"

	"prosper/model"
)

// schedulerTick is how often the loop checks which banks
// are due. The actual cadence comes from refreshInterval
const schedulerTick = time.Hour

// StartScheduler start periodic fetch of open banking transactions every refreshInterval.
func (s *Service) StartScheduler(ctx context.Context, wg *sync.WaitGroup) {
	if s.refreshInterval == 0 {
		log.Println("openbanking: refresh interval is 0, scheduler disabled")
		return
	}
	log.Printf("openbanking: scheduler started, interval=%s", s.refreshInterval)
	wg.Go(func() {
		s.runScheduled(ctx)
		ticker := time.NewTicker(schedulerTick)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				log.Println("openbanking: scheduler stopping")
				return
			case <-ticker.C:
				s.runScheduled(ctx)
			}
		}
	})
}

// runScheduled fetches every connected account whose last fetch is older than refreshInterval.
func (s *Service) runScheduled(ctx context.Context) {
	accounts, err := s.allConnectedAccounts(ctx)
	if err != nil {
		log.Printf("openbanking: list connected accounts: %v", err)
		return
	}
	for _, a := range accounts {
		due, err := s.dueForFetch(ctx, a.UserID, a.InternalAccountID)
		if err != nil {
			log.Printf("openbanking: due check user=%d account=%d: %v", a.UserID, a.InternalAccountID, err)
			continue
		}
		if !due {
			continue
		}
		p, err := s.providerForBank(ctx, a.UserID, a.BankID)
		if err != nil {
			log.Printf("openbanking: provider for user=%d bank=%d: %v", a.UserID, a.BankID, err)
			continue
		}
		if _, err := s.fetchAccount(ctx, a.UserID, p, a, model.FetchTriggerScheduled); err != nil {
			log.Printf("openbanking: scheduled fetch user=%d account=%d: %v", a.UserID, a.InternalAccountID, err)
		}
	}
}

// allConnectedAccounts returns every mapped, non-archived account whose
// bank has a stored provider token across all app users.
func (s *Service) allConnectedAccounts(ctx context.Context) ([]model.OpenBankingMapping, error) {
	var accounts []model.OpenBankingMapping
	err := s.db.Raw().SelectContext(ctx, &accounts,
		`SELECT m.userId, a.bankId, m.internalAccountId, m.externalAccountId
		   FROM ExternalAccountMapping m
		   JOIN BankAccount a ON a.id = m.internalAccountId
		  WHERE a.archived = FALSE`)
	return accounts, err
}

// dueForFetch reports whether the account's most recent fetch (of any
// outcome) is older than refreshInterval, or it has never been fetched.
func (s *Service) dueForFetch(ctx context.Context, userID, internalAccountID int32) (bool, error) {
	var startedAt time.Time
	err := s.db.GetForUser(ctx, &startedAt, userID,
		`SELECT startedAt FROM OpenBankingFetch
		  WHERE userId = :userId AND internalAccountId = :internalAccountId
		  ORDER BY startedAt DESC LIMIT 1`,
		map[string]any{"internalAccountId": internalAccountID})
	if errors.Is(err, sql.ErrNoRows) {
		return true, nil
	}
	if err != nil {
		return false, err
	}
	return time.Since(startedAt) >= s.refreshInterval, nil
}
