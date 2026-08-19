import {TextButton} from '@/components/ui/text-button';
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
        <TextButton asChild>
          <Link
            href={`/config/open-banking/gocardless/institutions?bankId=${bank.id}`}
          >
            Change country
          </Link>
        </TextButton>
      </div>
      <h1 className="mb-2 text-xl font-medium leading-7">Select bank:</h1>
      <div className="space-y-2">
        {institutions.map(institution => (
          <a
            key={institution.id}
            href={`/config/open-banking/gocardless/connect?bankId=${bank.id}&institutionId=${institution.id}`}
            className="bg-card hover:bg-secondary flex flex-row items-center gap-4 rounded-md p-2 font-semibold transition-colors"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={institution.logoUrl}
              alt={`${institution.name} logo`}
              className="h-16 w-16"
            />
            {institution.name}
          </a>
        ))}
      </div>
    </>
  );
}
