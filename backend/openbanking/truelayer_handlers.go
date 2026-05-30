package openbanking

import (
	"context"
	"errors"

	"prosper/auth"
	prosperv1 "prosper/gen/prosper/v1"
	"prosper/openbanking/truelayer"
)

// trueLayerProvider returns the registered TrueLayer provider, or an
// error if the service was started without TrueLayer credentials.
func (s *Service) trueLayerProvider() (*truelayer.Provider, error) {
	tl, ok := s.prov[prosperv1.Provider_PROVIDER_TRUELAYER].(*truelayer.Provider)
	if !ok || tl == nil {
		return nil, errors.New("truelayer provider not configured")
	}
	return tl, nil
}

func (s *Service) StartTrueLayerConnection(_ context.Context, req *prosperv1.StartTrueLayerConnectionRequest) (*prosperv1.StartTrueLayerConnectionResponse, error) {
	tl, err := s.trueLayerProvider()
	if err != nil {
		return nil, err
	}
	return &prosperv1.StartTrueLayerConnectionResponse{
		AuthUrl: tl.AuthURL(req.BankId),
	}, nil
}

func (s *Service) CompleteTrueLayerConnection(ctx context.Context, req *prosperv1.CompleteTrueLayerConnectionRequest) (*prosperv1.CompleteTrueLayerConnectionResponse, error) {
	userID := auth.MustUserIDFromContext(ctx)
	tl, err := s.trueLayerProvider()
	if err != nil {
		return nil, err
	}
	wasReconnect, err := tl.ExchangeCode(ctx, userID, req.BankId, req.Code)
	if err != nil {
		return nil, err
	}
	return &prosperv1.CompleteTrueLayerConnectionResponse{WasReconnect: wasReconnect}, nil
}
