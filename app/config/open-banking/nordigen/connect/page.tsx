import { CountriesSelector } from "app/config/open-banking/nordigen/connect/CountriesSelector";
import { InstitutionSelector } from "app/config/open-banking/nordigen/connect/InstitutionSelector";
import { DB } from "lib/db";
import { NORDIGEN_COUNTRIES } from "lib/openbanking/nordigen/countries";
import { Institution } from "lib/openbanking/nordigen/institution";
import { getOrCreateToken } from "lib/openbanking/nordigen/token";
import { getUserId } from "lib/user";
import { intParamOrFirst, paramOrFirst } from "lib/util/searchParams";
import { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Nordigen Connect - Prosper",
};

async function getData(userId: number, bankId: number, country: string|undefined) {
  const db = new DB({ userId });
  const [dbBank] = await db.bankFindMany({
    where: {
      id: bankId,
    },
  });
  if (!dbBank) {
    return notFound();
  }
  if (!country) {
    return { dbBank };
  }
  if (!NORDIGEN_COUNTRIES.find((c) => c.code === country)) {
    return notFound();
  }
  const token = await getOrCreateToken(db, bankId);
  const institutionsResponse = await fetch(
    `https://ob.nordigen.com/api/v2/institutions/?country=${country}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token.access}` },
    },
  );
  const institutions: Institution[] = await institutionsResponse.json();
  institutions.sort((a, b) => a.name.localeCompare(b.name));
  return { dbBank, institutions };
}

export default async function Page({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const bankId = intParamOrFirst(searchParams["bankId"]);
  if (!bankId) {
    return notFound();
  }
  const userId = await getUserId();
  const country = paramOrFirst(searchParams["country"]);
  const { dbBank, institutions } = await getData(userId, bankId, country);
  return (
    <>
      {!institutions && <CountriesSelector dbBank={dbBank} />}
      {!!institutions && (
        <InstitutionSelector
          dbBank={dbBank}
          institutions={institutions}
          countryCode={country}
        />
      )}
    </>
  );
}
