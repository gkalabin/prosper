package telegram

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"prosper/auth"
	prosperv1 "prosper/gen/prosper/v1"
	"prosper/userdb"
)

// Service implements the TelegramService gRPC surface used by the settings page.
type Service struct {
	prosperv1.UnimplementedTelegramServiceServer
	store  *store
	client *Client // nil when the bot is disabled
}

// NewService builds the service.
func NewService(db *userdb.DB, client *Client) *Service {
	return &Service{store: newStore(db), client: client}
}

func (s *Service) GetTelegramLinkStatus(ctx context.Context, _ *prosperv1.GetTelegramLinkStatusRequest) (*prosperv1.GetTelegramLinkStatusResponse, error) {
	userID := auth.MustUserIDFromContext(ctx)
	if s.client == nil {
		return &prosperv1.GetTelegramLinkStatusResponse{Configured: false}, nil
	}
	_, linked, err := s.store.Link(ctx, userID)
	if err != nil {
		return nil, err
	}
	return &prosperv1.GetTelegramLinkStatusResponse{Configured: true, Linked: linked}, nil
}

func (s *Service) CreateTelegramLink(ctx context.Context, _ *prosperv1.CreateTelegramLinkRequest) (*prosperv1.CreateTelegramLinkResponse, error) {
	userID := auth.MustUserIDFromContext(ctx)
	if s.client == nil {
		return nil, status.Error(codes.FailedPrecondition, "telegram bot not configured")
	}
	username, err := s.client.Username(ctx)
	if err != nil {
		return nil, err
	}
	token, err := newLinkToken()
	if err != nil {
		return nil, err
	}
	if err := s.store.ReplaceLinkToken(ctx, userID, token, time.Now().Add(linkTokenTTL)); err != nil {
		return nil, err
	}
	return &prosperv1.CreateTelegramLinkResponse{
		DeepLink: fmt.Sprintf("https://t.me/%s?start=%s", username, token),
	}, nil
}

func (s *Service) DeleteTelegramLink(ctx context.Context, _ *prosperv1.DeleteTelegramLinkRequest) (*prosperv1.DeleteTelegramLinkResponse, error) {
	userID := auth.MustUserIDFromContext(ctx)
	if s.client == nil {
		return nil, status.Error(codes.FailedPrecondition, "telegram bot not configured")
	}
	if err := s.store.DeleteLink(ctx, userID); err != nil {
		return nil, err
	}
	return &prosperv1.DeleteTelegramLinkResponse{}, nil
}

// linkTokenBytes is the entropy of a link token: 256 bits.
const linkTokenBytes = 32

// newLinkToken mints a URL-safe single-use link token.
func newLinkToken() (string, error) {
	b := make([]byte, linkTokenBytes)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}
