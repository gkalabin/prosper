import {Button} from '@/components/ui/button';
import {Institution} from '@/lib/openbanking/nordigen/institution';
import {Bank as DBBank} from '@prisma/client';
import Link from 'next/link';

export function InstitutionSelector({
  dbBank,
  institutions,
  countryCode,
}: {
  dbBank: DBBank;
  institutions: Institution[];
  countryCode: string;
}) {
  return (
    <>
      <div className="mb-4">
        Showing banks for {countryCode}.{' '}
        <Button variant="link" size="inherit" asChild>
          <Link
            href={`/config/open-banking/nordigen/connect?bankId=${dbBank.id}`}
          >
            Change country
          </Link>
        </Button>
      </div>
      <h1 className="mb-2 text-xl leading-7 font-medium">Select bank:</h1>
      <div className="space-y-2">
        {institutions.map(institution => (
          <div key={institution.id} className="rounded-md bg-slate-50 p-2">
            <Button variant="link" size="inherit" asChild>
              <a
                href={`/api/open-banking/nordigen/connect?bankId=${dbBank.id}&institutionId=${institution.id}`}
                className="flex flex-row items-center gap-4"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={institution.logo}
                  alt={institution.name}
                  className="h-16 w-16"
                />
                {institution.name}
              </a>
            </Button>
          </div>
        ))}
      </div>
    </>
  );
}
