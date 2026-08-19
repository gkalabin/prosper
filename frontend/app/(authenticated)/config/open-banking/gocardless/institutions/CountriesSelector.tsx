import {TextButton} from '@/components/ui/text-button';
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
            <TextButton asChild>
              <Link
                href={`/config/open-banking/gocardless/institutions?bankId=${bank.id}&country=${code}`}
              >
                {name}
              </Link>
            </TextButton>
          </div>
        ))}
    </>
  );
}
