import {Button} from '@/components/ui/button';
import {Bank} from '@/lib/grpc/gen/prosper/v1/ledger';
import {NordigenCountry} from '@/lib/grpc/gen/prosper/v1/openbanking';
import Link from 'next/link';

export function CountriesSelector({
  bank,
  countries,
}: {
  bank: Bank;
  countries: NordigenCountry[];
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
                href={`/config/open-banking/nordigen/connect?bankId=${bank.id}&country=${code}`}
              >
                {name}
              </Link>
            </Button>
          </div>
        ))}
    </>
  );
}
