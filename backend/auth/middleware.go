package auth

import (
	"context"
	"database/sql"
	"errors"
	"log"
	"strings"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// publicMethodPrefix is the gRPC service prefix whose RPCs bootstrap
// authentication (login, registration, session lifecycle) and so cannot
// require an existing session themselves.
const publicMethodPrefix = "/prosper.v1.AuthService/"

// sessionedRequest is satisfied by any proto Request message that
// includes a `session_id` field — the protoc-gen-go output adds the
// matching getter automatically.
type sessionedRequest interface {
	GetSessionId() string
}

type ctxKey struct{}

// contextWithUserID returns ctx with userID attached.
func contextWithUserID(ctx context.Context, userID int32) context.Context {
	return context.WithValue(ctx, ctxKey{}, userID)
}

// MustUserIDFromContext returns the userID set by the interceptor.
// Panics when missing.
func MustUserIDFromContext(ctx context.Context) int32 {
	id, ok := ctx.Value(ctxKey{}).(int32)
	if !ok {
		panic("auth: userID missing from context")
	}
	return id
}

// UnaryServerInterceptor validates the session_id field on every
// non-public RPC and stamps the resolved userID into the request
// context.
func UnaryServerInterceptor(s *Service) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (any, error) {
		start := time.Now()
		newCtx, userID, authErr := resolveAuth(ctx, req, info.FullMethod, s)
		if authErr != nil {
			logRPC(info.FullMethod, userID, start, authErr)
			return nil, authErr
		}
		resp, err := handler(newCtx, req)
		logRPC(info.FullMethod, userID, start, err)
		return resp, err
	}
}

func resolveAuth(ctx context.Context, req any, fullMethod string, s *Service) (context.Context, int32, error) {
	if strings.HasPrefix(fullMethod, publicMethodPrefix) {
		return ctx, 0, nil
	}
	sr, ok := req.(sessionedRequest)
	if !ok {
		return ctx, 0, status.Errorf(codes.Internal, "request %T missing session_id field", req)
	}
	sessionID := sr.GetSessionId()
	if sessionID == "" {
		return ctx, 0, status.Error(codes.Unauthenticated, "missing session_id")
	}
	userID, ok, err := s.userIDForSession(ctx, sessionID)
	if err != nil {
		return ctx, 0, status.Errorf(codes.Internal, "session lookup: %v", err)
	}
	if !ok {
		return ctx, 0, status.Error(codes.Unauthenticated, "invalid session")
	}
	return contextWithUserID(ctx, userID), userID, nil
}

func logRPC(method string, userID int32, start time.Time, err error) {
	code := status.Code(err)
	dur := time.Since(start)
	if err != nil {
		log.Printf("rpc: %s user=%d code=%s dur=%s err=%v", method, userID, code, dur, err)
		return
	}
	log.Printf("rpc: %s user=%d code=%s dur=%s", method, userID, code, dur)
}

// userIDForSession returns the userID behind a session id, or ok=false
// when the session is missing or expired.
func (s *Service) userIDForSession(ctx context.Context, sessionID string) (int32, bool, error) {
	var row struct {
		UserID int32 `db:"userId"`
	}
	err := s.db.GetContext(ctx, &row,
		`SELECT userId FROM Session WHERE id = ? AND expiresAt > ?`,
		sessionID, time.Now())
	if errors.Is(err, sql.ErrNoRows) {
		return 0, false, nil
	}
	if err != nil {
		return 0, false, err
	}
	return row.UserID, true, nil
}
