package auth

import (
	"context"
	"database/sql"
	"errors"
	"log"
	"sync"
	"time"

	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/protobuf/types/known/timestamppb"

	prosperv1 "prosper/gen/prosper/v1"
	"prosper/model"
)

type Service struct {
	prosperv1.UnimplementedAuthServiceServer
	db *sqlx.DB
}

func NewService(db *sqlx.DB) *Service { return &Service{db: db} }

// sessionExtensionTTL is the lifespan re-applied when a session is
// auto-extended on validation.
const sessionExtensionTTL = 7 * 24 * time.Hour

// expiredSessionSweepInterval is how often the background goroutine
// deletes expired sessions. The DELETE is cheap and the sweep doesn't
// need to be tight — Session validation ignores expired rows.
const expiredSessionSweepInterval = 6 * time.Hour

func (s *Service) ValidateSession(ctx context.Context, req *prosperv1.ValidateSessionRequest) (*prosperv1.ValidateSessionResponse, error) {
	var row struct {
		SessionID string    `db:"sessionId"`
		UserID    int32     `db:"userId"`
		Login     string    `db:"login"`
		ExpiresAt time.Time `db:"expiresAt"`
	}
	err := s.db.GetContext(ctx, &row,
		`SELECT s.id AS sessionId, s.userId, s.expiresAt, u.login
		 FROM Session s JOIN User u ON u.id = s.userId
		 WHERE s.id = ?`, req.SessionId)
	if errors.Is(err, sql.ErrNoRows) {
		return &prosperv1.ValidateSessionResponse{Valid: false}, nil
	}
	if err != nil {
		return nil, err
	}
	now := time.Now()
	if now.After(row.ExpiresAt) {
		// The expired row is best-effort cleanup; the caller already
		// gets valid=false either way, so a delete failure shouldn't
		// fail the request — the next sweep will retry.
		if _, delErr := s.db.ExecContext(ctx,
			`DELETE FROM Session WHERE id = ?`, row.SessionID); delErr != nil {
			log.Printf("auth: delete expired session %s: %v", row.SessionID, delErr)
		}
		return &prosperv1.ValidateSessionResponse{Valid: false}, nil
	}
	resp := &prosperv1.ValidateSessionResponse{
		Valid:     true,
		UserId:    row.UserID,
		UserLogin: row.Login,
	}
	// If less than half the TTL remains, slide the expiry forward to improve UX for users who visit the app at least weekly.
	if row.ExpiresAt.Sub(now) < sessionExtensionTTL/2 {
		newExpiry := now.Add(sessionExtensionTTL)
		if _, err := s.db.ExecContext(ctx,
			`UPDATE Session SET expiresAt = ? WHERE id = ?`,
			newExpiry, row.SessionID); err != nil {
			// Sliding the expiry is a best-effort UX improvement; on
			// failure the session still works for the rest of its
			// existing TTL, so we log and return the unextended response.
			log.Printf("auth: extend session %s: %v", row.SessionID, err)
			return resp, nil
		}
		resp.ExtendedExpiresAt = timestamppb.New(newExpiry)
	}
	return resp, nil
}

func (s *Service) CreateSession(ctx context.Context, req *prosperv1.CreateSessionRequest) (*prosperv1.CreateSessionResponse, error) {
	expiresAt := time.Now().Add(sessionExtensionTTL)
	if _, err := s.db.NamedExecContext(ctx,
		`INSERT INTO Session
		        ( id,  userId,  expiresAt)
		 VALUES (:id, :userId, :expiresAt)`,
		model.Session{
			ID:        req.SessionId,
			UserID:    req.UserId,
			ExpiresAt: expiresAt,
		}); err != nil {
		return nil, err
	}
	return &prosperv1.CreateSessionResponse{ExpiresAt: timestamppb.New(expiresAt)}, nil
}

func (s *Service) DeleteSession(ctx context.Context, req *prosperv1.DeleteSessionRequest) (*prosperv1.DeleteSessionResponse, error) {
	_, err := s.db.ExecContext(ctx,
		`DELETE FROM Session WHERE id = ?`, req.SessionId)
	if err != nil {
		return nil, err
	}
	return &prosperv1.DeleteSessionResponse{}, nil
}

// StartExpiredSessionSweeper periodically deletes expired sessions in
// the background so the Session table doesn't grow unbounded. The
// goroutine is registered on wg so the caller can block on shutdown
// until the in-flight sweep returns.
func (s *Service) StartExpiredSessionSweeper(ctx context.Context, wg *sync.WaitGroup) {
	wg.Go(func() {
		ticker := time.NewTicker(expiredSessionSweepInterval)
		defer ticker.Stop()
		s.sweepExpiredSessions(ctx)
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				s.sweepExpiredSessions(ctx)
			}
		}
	})
}

func (s *Service) sweepExpiredSessions(ctx context.Context) {
	res, err := s.db.ExecContext(ctx,
		`DELETE FROM Session WHERE expiresAt < ?`, time.Now())
	if err != nil {
		log.Printf("auth: sweep expired sessions: %v", err)
		return
	}
	if n, _ := res.RowsAffected(); n > 0 {
		log.Printf("auth: swept %d expired session(s)", n)
	}
}

func (s *Service) CountUsers(ctx context.Context, _ *prosperv1.CountUsersRequest) (*prosperv1.CountUsersResponse, error) {
	var n int32
	if err := s.db.GetContext(ctx, &n, `SELECT COUNT(*) FROM User`); err != nil {
		return nil, err
	}
	return &prosperv1.CountUsersResponse{Count: n}, nil
}

func (s *Service) Authenticate(ctx context.Context, req *prosperv1.AuthenticateRequest) (*prosperv1.AuthenticateResponse, error) {
	var u model.User
	err := s.db.GetContext(ctx, &u,
		`SELECT * FROM User WHERE login = ?`, req.Login)
	if errors.Is(err, sql.ErrNoRows) {
		return &prosperv1.AuthenticateResponse{Ok: false}, nil
	}
	if err != nil {
		return nil, err
	}
	if err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(req.Password)); err != nil {
		return &prosperv1.AuthenticateResponse{Ok: false}, nil
	}
	return &prosperv1.AuthenticateResponse{Ok: true, UserId: u.ID}, nil
}

const registerBcryptCost = 12

func (s *Service) Register(ctx context.Context, req *prosperv1.RegisterRequest) (*prosperv1.RegisterResponse, error) {
	// bcrypt cost runs outside the DB transaction so the
	// expensive hashing doesn't hold a row-level lock.
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), registerBcryptCost)
	if err != nil {
		return nil, err
	}
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var existing int
	if err := tx.GetContext(ctx, &existing,
		`SELECT COUNT(*) FROM User WHERE login = ?`, req.Login); err != nil {
		return nil, err
	}
	if existing > 0 {
		return &prosperv1.RegisterResponse{
			Ok:    false,
			Error: "User with this login already exists.",
		}, nil
	}

	res, err := tx.NamedExecContext(ctx,
		`INSERT INTO User
		        ( login,  password)
		 VALUES (:login, :password)`,
		model.User{
			Login:    req.Login,
			Password: string(hash),
		})
	if err != nil {
		return nil, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	if err := seedNewUser(ctx, tx, id); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &prosperv1.RegisterResponse{Ok: true, UserId: int32(id)}, nil
}
