package nordigen

import (
	"context"
	"net/url"

	prosperv1 "prosper/gen/prosper/v1"
)

const institutionsURL = apiBase + "/institutions/"

// institutionItem is one row from /institutions.
type institutionItem struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Logo string `json:"logo"`
}

// ListInstitutions queries Nordigen's institutions catalog for a
// country code (uppercased ISO 3166-1 alpha-2) and returns them as
// proto messages.
func (n *Provider) ListInstitutions(ctx context.Context, country string) ([]*prosperv1.NordigenInstitution, error) {
	access, err := n.appLevelToken(ctx)
	if err != nil {
		return nil, err
	}
	q := url.Values{}
	q.Set("country", country)
	var items []institutionItem
	if err := n.getJSON(ctx, institutionsURL+"?"+q.Encode(), access, &items); err != nil {
		return nil, err
	}
	out := make([]*prosperv1.NordigenInstitution, 0, len(items))
	for _, i := range items {
		out = append(out, &prosperv1.NordigenInstitution{
			Id:      i.ID,
			Name:    i.Name,
			LogoUrl: i.Logo,
		})
	}
	return out, nil
}
