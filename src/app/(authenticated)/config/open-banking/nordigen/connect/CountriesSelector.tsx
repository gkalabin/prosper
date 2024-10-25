import {Button} from '@/components/ui/button';
import {NORDIGEN_COUNTRIES} from '@/lib/openbanking/nordigen/countries';
import {Bank as DBBank} from '@prisma/client';
import Link from 'next/link';

export function CountriesSelector({dbBank}: {dbBank: DBBank}) {
  return (
    <>
      Select country:
      {NORDIGEN_COUNTRIES.sort((a, b) => a.name.localeCompare(b.name)).map(
        ({code, name}) => (
          <div key={code}>
            <Button variant="link" size="inherit" asChild>
              <Link
                href={`/config/open-banking/nordigen/connect?bankId=${dbBank.id}&country=${code}`}
              >
                {name}
              </Link>
            </Button>
          </div>
        )
      )}
    </>
  );
}
