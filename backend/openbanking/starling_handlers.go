package openbanking

import (
	"context"
	"errors"

	"prosper/auth"
	prosperv1 "prosper/gen/prosper/v1"
	"prosper/openbanking/starling"
)

// starlingProvider returns the registered Starling provider, or an
// error if the service was started without Starling configured.
func (s *Service) starlingProvider() (*starling.Provider, error) {
	sl, ok := s.prov[prosperv1.Provider_PROVIDER_STARLING].(*starling.Provider)
	if !ok || sl == nil {
		return nil, errors.New("starling provider not configured")
	}
	return sl, nil
}

func (s *Service) SetStarlingToken(ctx context.Context, req *prosperv1.SetStarlingTokenRequest) (*prosperv1.SetStarlingTokenResponse, error) {
	userID := auth.MustUserIDFromContext(ctx)
	sl, err := s.starlingProvider()
	if err != nil {
		return nil, err
	}
	wasReconnect, err := sl.SetToken(ctx, userID, req.BankId, req.AccessToken)
	if err != nil {
		return nil, err
	}
	return &prosperv1.SetStarlingTokenResponse{WasReconnect: wasReconnect}, nil
}
