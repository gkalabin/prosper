import { AnchorLink } from "components/ui/anchors";
import { NORDIGEN_COUNTRIES } from "lib/openbanking/nordigen/countries";

export function CountriesSelector({ dbBank }) {
  return (
    <>
      Select country:
      {NORDIGEN_COUNTRIES.sort((a, b) => a.name.localeCompare(b.name)).map(
        ({ code, name }) => (
          <div key={code}>
            <AnchorLink
              href={`/config/open-banking/nordigen/connect?bankId=${dbBank.id}&country=${code}`}
            >
              {name}
            </AnchorLink>
          </div>
        ),
      )}
    </>
  );
}
