import {CountriesSelector} from '@/app/(authenticated)/config/open-banking/gocardless/connect/CountriesSelector';
import {InstitutionSelector} from '@/app/(authenticated)/config/open-banking/gocardless/connect/InstitutionSelector';
import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {withAuth} from '@/lib/grpc/auth';
import {fetchCoreData} from '@/lib/db/fetch';
import {openBankingClient} from '@/lib/grpc/client';
import {GoCardlessInstitution} from '@/lib/grpc/gen/prosper/v1/openbanking';
import {
  firstPositiveIntOrNull,
  firstValueOrNull,
} from '@/lib/util/searchParams';
import {Metadata} from 'next';
import {notFound} from 'next/navigation';

export const metadata: Metadata = {
  title: 'GoCardless Connect - Prosper',
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{[key: string]: string | string[] | undefined}>;
}) {
  const resolvedSearchParams = await searchParams;
  const bankId = firstPositiveIntOrNull(resolvedSearchParams['bankId']);
  if (!bankId) {
    return notFound();
  }
  const auth = await getAuthContextOrRedirect();
  const core = await fetchCoreData(auth);
  const bank = core.banks.find(b => b.id === bankId);
  if (!bank) {
    return notFound();
  }
  const country = firstValueOrNull(resolvedSearchParams['country']);
  if (!country) {
    const {response} = await openBankingClient.listGoCardlessCountries(
      withAuth({}, auth)
    );
    return <CountriesSelector bank={bank} countries={response.countries} />;
  }
  const {response: countriesResp} =
    await openBankingClient.listGoCardlessCountries(withAuth({}, auth));
  if (!countriesResp.countries.find(c => c.code === country)) {
    return notFound();
  }
  const {response: institutionsResp} =
    await openBankingClient.listGoCardlessInstitutions(
      withAuth({countryCode: country}, auth)
    );
  const institutions: GoCardlessInstitution[] = [
    ...institutionsResp.institutions,
  ];
  institutions.sort((a, b) => a.name.localeCompare(b.name));
  return (
    <InstitutionSelector
      bank={bank}
      institutions={institutions}
      countryCode={country}
    />
  );
}
