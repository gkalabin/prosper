package gocardless

import prosperv1 "prosper/gen/prosper/v1"

// supportedCountries is the static catalog of countries GoCardless
// supports, returned by Countries.
var supportedCountries = []struct {
	code string
	name string
}{
	{"AT", "Austria"},
	{"BE", "Belgium"},
	{"BG", "Bulgaria"},
	{"CY", "Cyprus"},
	{"CZ", "Czech Republic"},
	{"DE", "Germany"},
	{"DK", "Denmark"},
	{"EE", "Estonia"},
	{"ES", "Spain"},
	{"FI", "Finland"},
	{"FR", "France"},
	{"GB", "United Kingdom"},
	{"GR", "Greece"},
	{"HR", "Croatia"},
	{"HU", "Hungary"},
	{"IE", "Ireland"},
	{"IS", "Iceland"},
	{"IT", "Italy"},
	{"LI", "Liechtenstein"},
	{"LT", "Lithuania"},
	{"LU", "Luxembourg"},
	{"LV", "Latvia"},
	{"MT", "Malta"},
	{"NL", "Netherlands"},
	{"NO", "Norway"},
	{"PL", "Poland"},
	{"PT", "Portugal"},
	{"RO", "Romania"},
	{"SE", "Sweden"},
	{"SI", "Slovenia"},
	{"SK", "Slovakia"},
}

// Countries returns the static list of supported GoCardless countries
// for the listing RPC. GoCardless doesn't publish a programmatic catalog
// of supported countries, so we curate this list.
func Countries() []*prosperv1.GoCardlessCountry {
	out := make([]*prosperv1.GoCardlessCountry, 0, len(supportedCountries))
	for _, c := range supportedCountries {
		out = append(out, &prosperv1.GoCardlessCountry{Code: c.code, Name: c.name})
	}
	return out
}
