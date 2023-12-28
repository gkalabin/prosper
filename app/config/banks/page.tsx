import { BanksPage } from "app/config/banks/client";
import { DB } from "lib/db";
import { getUserId } from "lib/user";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Banks Configuration - Prosper",
};

async function getData(userId: number) {
  const db = new DB({ userId });
  const dbStocks = await db.stocksFindMany();
  const dbBanks = await db.bankFindMany();
  const whereBankId = {
    where: {
      bankId: {
        in: dbBanks.map((x) => x.id),
      },
    },
  };
  const dbBankAccounts = await db.bankAccountFindMany(whereBankId);
  const dbTrueLayerTokens = await db.trueLayerTokenFindMany(whereBankId);
  const dbNordigenTokens = await db.nordigenTokenFindMany(whereBankId);
  const dbStarlingTokens = await db.starlingTokenFindMany(whereBankId);

  return {
    dbBanks,
    dbBankAccounts,
    dbStocks,
    dbTrueLayerTokens,
    dbNordigenTokens,
    dbStarlingTokens,
  };
}

export default async function Page() {
  const userId = await getUserId();
  const data = await getData(userId);
  return (
    <>
      <BanksPage
        dbBanks={data.dbBanks}
        dbBankAccounts={data.dbBankAccounts}
        dbStocks={data.dbStocks}
        dbTrueLayerTokens={data.dbTrueLayerTokens}
        dbNordigenTokens={data.dbNordigenTokens}
        dbStarlingTokens={data.dbStarlingTokens}
      />
    </>
  );
}
