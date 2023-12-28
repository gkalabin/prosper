import { Bank as DBBank } from "@prisma/client";
import { ConfigPageLayout } from "components/ConfigPageLayout";
import { AnchorLink, ExternalAnchorLink } from "components/ui/buttons";
import { DB } from "lib/db";
import { getOrCreateToken } from "lib/openbanking/nordigen/token";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { getServerSession } from "next-auth/next";
import { useRouter } from "next/router";
import { authOptions } from "pages/api/auth/[...nextauth]";

const countries = [
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgium" },
  { code: "BG", name: "Bulgaria" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czech Republic" },
  { code: "DE", name: "Germany" },
  { code: "DK", name: "Denmark" },
  { code: "EE", name: "Estonia" },
  { code: "ES", name: "Spain" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "GB", name: "United Kingdom" },
  { code: "GR", name: "Greece" },
  { code: "HR", name: "Croatia" },
  { code: "HU", name: "Hungary" },
  { code: "IE", name: "Ireland" },
  { code: "IS", name: "Iceland" },
  { code: "IT", name: "Italy" },
  { code: "LI", name: "Liechtenstein" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "LV", name: "Latvia" },
  { code: "MT", name: "Malta" },
  { code: "NL", name: "Netherlands" },
  { code: "NO", name: "Norway" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "RO", name: "Romania" },
  { code: "SE", name: "Sweden" },
  { code: "SI", name: "Slovenia" },
  { code: "SK", name: "Slovakia" },
];

type Institution = {
  id: string;
  name: string;
  bic: string;
  logo: string;
  transaction_total_days: string;
  countries: string[];
};

export const getServerSideProps: GetServerSideProps<{
  dbBank: DBBank;
  institutions?: Institution[];
}> = async ({ query, req, res }) => {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }
  const bankId = parseInt(query.bankId as string, 10);
  const userId = +session.user.id;
  const db = new DB({ userId });
  const [bank] = await db.bankFindMany({
    where: {
      id: bankId,
    },
  });
  if (!bank) {
    return {
      notFound: true,
    };
  }
  const country = query.country;
  if (!country) {
    return {
      props: JSON.parse(
        JSON.stringify({
          dbBank: bank,
        })
      ),
    };
  }
  if (!countries.find((c) => c.code === country)) {
    return {
      notFound: true,
    };
  }
  const token = await getOrCreateToken(db, bankId);
  const institutionsResponse = await fetch(
    `https://ob.nordigen.com/api/v2/institutions/?country=${country}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token.access}` },
    }
  );
  const institutions = await institutionsResponse.json();
  institutions.sort((a, b) => a.name.localeCompare(b.name));
  return {
    props: JSON.parse(
      JSON.stringify({
        dbBank: bank,
        institutions,
      })
    ),
  };
};

function CountriesSelector({ dbBank }) {
  return (
    <>
      Select country:
      {countries
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(({ code, name }) => (
          <div key={code}>
            <AnchorLink
              href={`/config/open-banking/nordigen/connect?bankId=${dbBank.id}&country=${code}`}
            >
              {name}
            </AnchorLink>
          </div>
        ))}
    </>
  );
}

function InstitutionSelector({
  dbBank,
  institutions,
}: {
  dbBank: DBBank;
  institutions: Institution[];
}) {
  const router = useRouter();
  return (
    <>
      <div className="mb-4">
        Showing banks for {router.query.country}.{" "}
        <AnchorLink
          href={`/config/open-banking/nordigen/connect?bankId=${dbBank.id}`}
        >
          Change country
        </AnchorLink>
      </div>
      <h1 className="mb-2 text-xl font-medium leading-7">Select bank:</h1>
      <div className="space-y-2">
        {institutions.map((institution) => (
          <div
            key={institution.id}
            className="rounded rounded-md bg-slate-50 p-2"
          >
            <ExternalAnchorLink
              href={`/api/open-banking/nordigen/connect?bankId=${dbBank.id}&institutionId=${institution.id}`}
              className="flex flex-row items-center gap-4"
            >
              <img
                src={institution.logo}
                alt={institution.name}
                className="h-16 w-16"
              />
              {institution.name}
            </ExternalAnchorLink>
          </div>
        ))}
      </div>
    </>
  );
}

export default function Page({
  dbBank,
  institutions,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <ConfigPageLayout>
      {!institutions && <CountriesSelector dbBank={dbBank} />}
      {!!institutions && (
        <InstitutionSelector dbBank={dbBank} institutions={institutions} />
      )}
    </ConfigPageLayout>
  );
}
