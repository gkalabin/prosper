package telegram

import (
	"context"
	"fmt"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"prosper/auth"
	prosperv1 "prosper/gen/prosper/v1"
	"prosper/userdb"
)

// deepLinkFormat renders the t.me link that hands a token to the bot when opened.
const deepLinkFormat = "https://t.me/%s?start=%s"

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
	if linked {
		return &prosperv1.GetTelegramLinkStatusResponse{Configured: true, Linked: true}, nil
	}
	username, err := s.client.Username(ctx)
	if err != nil {
		return nil, err
	}
	token, err := s.store.LinkToken(ctx, userID)
	if err != nil {
		return nil, err
	}
	return &prosperv1.GetTelegramLinkStatusResponse{
		Configured:  true,
		LinkUrl:     fmt.Sprintf(deepLinkFormat, username, token),
		LinkCommand: fmt.Sprintf("%s %s", linkCommand, token),
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
