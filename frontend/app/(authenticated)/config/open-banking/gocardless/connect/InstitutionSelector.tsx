import {Button} from '@/components/ui/button';
import {Bank} from '@/lib/grpc/gen/prosper/v1/ledger';
import {GoCardlessInstitution} from '@/lib/grpc/gen/prosper/v1/openbanking';
import Link from 'next/link';

export function InstitutionSelector({
  bank,
  institutions,
  countryCode,
}: {
  bank: Bank;
  institutions: GoCardlessInstitution[];
  countryCode: string;
}) {
  return (
    <>
      <div className="mb-4">
        Showing banks for {countryCode}.{' '}
        <Button variant="link" size="inherit" asChild>
          <Link
            href={`/config/open-banking/gocardless/connect?bankId=${bank.id}`}
          >
            Change country
          </Link>
        </Button>
      </div>
      <h1 className="mb-2 text-xl font-medium leading-7">Select bank:</h1>
      <div className="space-y-2">
        {institutions.map(institution => (
          <div key={institution.id} className="rounded-md bg-slate-50 p-2">
            <Button variant="link" size="inherit" asChild>
              <a
                href={`/api/open-banking/gocardless/connect?bankId=${bank.id}&institutionId=${institution.id}`}
                className="flex flex-row items-center gap-4"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={institution.logoUrl}
                  alt={`${institution.name} logo`}
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
