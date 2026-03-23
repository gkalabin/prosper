package openbanking

import (
	"context"
	"errors"

	"prosper/auth"
	prosperv1 "prosper/gen/prosper/v1"
	"prosper/openbanking/nordigen"
)

// nordigenProvider returns the registered Nordigen provider, or an error
// if the service was started without Nordigen credentials.
func (s *Service) nordigenProvider() (*nordigen.Provider, error) {
	nd, ok := s.prov[prosperv1.Provider_PROVIDER_NORDIGEN].(*nordigen.Provider)
	if !ok || nd == nil {
		return nil, errors.New("nordigen provider not configured")
	}
	return nd, nil
}

func (s *Service) StartNordigenConnection(ctx context.Context, req *prosperv1.StartNordigenConnectionRequest) (*prosperv1.StartNordigenConnectionResponse, error) {
	userID := auth.MustUserIDFromContext(ctx)
	nd, err := s.nordigenProvider()
	if err != nil {
		return nil, err
	}
	_, link, err := nd.CreateRequisition(ctx, userID, req.BankId, req.InstitutionId, req.RedirectUri)
	if err != nil {
		return nil, err
	}
	return &prosperv1.StartNordigenConnectionResponse{AuthUrl: link}, nil
}

func (s *Service) CompleteNordigenConnection(ctx context.Context, req *prosperv1.CompleteNordigenConnectionRequest) (*prosperv1.CompleteNordigenConnectionResponse, error) {
	userID := auth.MustUserIDFromContext(ctx)
	nd, err := s.nordigenProvider()
	if err != nil {
		return nil, err
	}
	bankID, wasReconnect, err := nd.CompleteRequisition(ctx, userID, req.Reference)
	if err != nil {
		return nil, err
	}
	return &prosperv1.CompleteNordigenConnectionResponse{BankId: bankID, WasReconnect: wasReconnect}, nil
}

func (s *Service) ListNordigenInstitutions(ctx context.Context, req *prosperv1.ListNordigenInstitutionsRequest) (*prosperv1.ListNordigenInstitutionsResponse, error) {
	nd, err := s.nordigenProvider()
	if err != nil {
		return nil, err
	}
	insts, err := nd.ListInstitutions(ctx, req.CountryCode)
	if err != nil {
		return nil, err
	}
	return &prosperv1.ListNordigenInstitutionsResponse{Institutions: insts}, nil
}

func (*Service) ListNordigenCountries(_ context.Context, _ *prosperv1.ListNordigenCountriesRequest) (*prosperv1.ListNordigenCountriesResponse, error) {
	return &prosperv1.ListNordigenCountriesResponse{Countries: nordigen.Countries()}, nil
}
