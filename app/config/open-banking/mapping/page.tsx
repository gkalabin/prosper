import { OpenBankingMappingConfigPage } from "app/config/open-banking/mapping/client";
import { DB } from "lib/db";
import { fetchAccounts } from "lib/openbanking/fetchall";
import { getUserId } from "lib/user";
import { intParamOrFirst } from "lib/util/searchParams";
import { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Open Banking Mapping - Prosper",
};

async function getData(userId: number, bankId: number) {
  const db = new DB({ userId });
  if (!bankId) {
    return notFound();
  }
  const [dbBank] = await db.bankFindMany({
    where: {
      id: bankId,
    },
  });
  if (!dbBank) {
    return notFound();
  }
  const externalAccounts = await fetchAccounts(db, bankId);
  if (externalAccounts == null) {
    return notFound();
  }
  const internalAccounts = await db.bankAccountFindMany({
    where: {
      bankId,
    },
  });
  return {
    dbBank,
    dbBankAccounts: internalAccounts,
    dbStocks: await db.stocksFindMany(),
    dbMapping: await db.externalAccountMappingFindMany({
      where: {
        internalAccountId: {
          in: internalAccounts.map((x) => x.id),
        },
      },
    }),
    externalAccounts,
  };
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
  const data = await getData(userId, bankId);
  return (
    <OpenBankingMappingConfigPage
      dbBank={data.dbBank}
      dbBankAccounts={data.dbBankAccounts}
      dbMapping={data.dbMapping}
      dbStocks={data.dbStocks}
      externalAccounts={data.externalAccounts}
    />
  );
}
