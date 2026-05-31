import {Button} from '@/components/ui/button';
import {Bank} from '@/lib/grpc/gen/prosper/v1/ledger';
import {GoCardlessCountry} from '@/lib/grpc/gen/prosper/v1/openbanking';
import Link from 'next/link';

export function CountriesSelector({
  bank,
  countries,
}: {
  bank: Bank;
  countries: GoCardlessCountry[];
}) {
  return (
    <>
      Select country:
      {[...countries]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(({code, name}) => (
          <div key={code}>
            <Button variant="link" size="inherit" asChild>
              <Link
                href={`/config/open-banking/gocardless/connect?bankId=${bank.id}&country=${code}`}
              >
                {name}
              </Link>
            </Button>
          </div>
        ))}
    </>
  );
}
