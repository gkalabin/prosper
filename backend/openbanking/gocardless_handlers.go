package openbanking

import (
	"context"
	"errors"

	"prosper/auth"
	prosperv1 "prosper/gen/prosper/v1"
	"prosper/openbanking/gocardless"
)

// gocardlessProvider returns the registered GoCardless provider, or an error
// if the service was started without GoCardless credentials.
func (s *Service) gocardlessProvider() (*gocardless.Provider, error) {
	nd, ok := s.prov[prosperv1.Provider_PROVIDER_GOCARDLESS].(*gocardless.Provider)
	if !ok || nd == nil {
		return nil, errors.New("gocardless provider not configured")
	}
	return nd, nil
}

func (s *Service) StartGoCardlessConnection(ctx context.Context, req *prosperv1.StartGoCardlessConnectionRequest) (*prosperv1.StartGoCardlessConnectionResponse, error) {
	userID := auth.MustUserIDFromContext(ctx)
	nd, err := s.gocardlessProvider()
	if err != nil {
		return nil, err
	}
	_, link, err := nd.CreateRequisition(ctx, userID, req.BankId, req.InstitutionId)
	if err != nil {
		return nil, err
	}
	return &prosperv1.StartGoCardlessConnectionResponse{AuthUrl: link}, nil
}

func (s *Service) CompleteGoCardlessConnection(ctx context.Context, req *prosperv1.CompleteGoCardlessConnectionRequest) (*prosperv1.CompleteGoCardlessConnectionResponse, error) {
	userID := auth.MustUserIDFromContext(ctx)
	nd, err := s.gocardlessProvider()
	if err != nil {
		return nil, err
	}
	bankID, wasReconnect, err := nd.CompleteRequisition(ctx, userID, req.Reference)
	if err != nil {
		return nil, err
	}
	return &prosperv1.CompleteGoCardlessConnectionResponse{BankId: bankID, WasReconnect: wasReconnect}, nil
}

func (s *Service) ListGoCardlessInstitutions(ctx context.Context, req *prosperv1.ListGoCardlessInstitutionsRequest) (*prosperv1.ListGoCardlessInstitutionsResponse, error) {
	nd, err := s.gocardlessProvider()
	if err != nil {
		return nil, err
	}
	insts, err := nd.ListInstitutions(ctx, req.CountryCode)
	if err != nil {
		return nil, err
	}
	return &prosperv1.ListGoCardlessInstitutionsResponse{Institutions: insts}, nil
}

func (*Service) ListGoCardlessCountries(_ context.Context, _ *prosperv1.ListGoCardlessCountriesRequest) (*prosperv1.ListGoCardlessCountriesResponse, error) {
	return &prosperv1.ListGoCardlessCountriesResponse{Countries: gocardless.Countries()}, nil
}
