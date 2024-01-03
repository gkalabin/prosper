import {CountriesSelector} from 'app/config/open-banking/nordigen/connect/CountriesSelector';
import {InstitutionSelector} from 'app/config/open-banking/nordigen/connect/InstitutionSelector';
import {DB} from 'lib/db';
import {NORDIGEN_COUNTRIES} from 'lib/openbanking/nordigen/countries';
import {Institution} from 'lib/openbanking/nordigen/institution';
import {getOrCreateToken} from 'lib/openbanking/nordigen/token';
import {getUserId} from 'lib/user';
import {intParamOrFirst, paramOrFirst} from 'lib/util/searchParams';
import {Metadata} from 'next';
import {notFound} from 'next/navigation';

export const metadata: Metadata = {
  title: 'Nordigen Connect - Prosper',
};

export default async function Page({
  searchParams,
}: {
  searchParams: {[key: string]: string | string[] | undefined};
}) {
  const bankId = intParamOrFirst(searchParams['bankId']);
  if (!bankId) {
    return notFound();
  }
  const userId = await getUserId();
  const db = new DB({userId});
  const [dbBank] = await db.bankFindMany({
    where: {
      id: bankId,
    },
  });
  if (!dbBank) {
    return notFound();
  }
  const country = paramOrFirst(searchParams['country']);
  if (!country) {
    return <CountriesSelector dbBank={dbBank} />;
  }
  if (!NORDIGEN_COUNTRIES.find(c => c.code === country)) {
    return notFound();
  }
  const token = await getOrCreateToken(db, bankId);
  const institutionsResponse = await fetch(
    `https://ob.nordigen.com/api/v2/institutions/?country=${country}`,
    {
      method: 'GET',
      headers: {Authorization: `Bearer ${token.access}`},
    }
  );
  const institutions: Institution[] = await institutionsResponse.json();
  if (!institutions) {
    return notFound();
  }
  institutions.sort((a, b) => a.name.localeCompare(b.name));
  return (
    <InstitutionSelector
      dbBank={dbBank}
      institutions={institutions}
      countryCode={country}
    />
  );
}
