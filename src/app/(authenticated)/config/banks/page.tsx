import {BanksConfigPage} from '@/app/(authenticated)/config/banks/BanksConfigPage';
import {getUserIdOrRedirect} from '@/lib/auth/user';
import {DB} from '@/lib/db';
import {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Banks Config - Prosper',
};

async function getData(userId: number) {
  const db = new DB({userId});
  const dbStocks = await db.stocksFindMany();
  const dbBanks = await db.bankFindMany();
  const whereBankId = {
    where: {
      bankId: {
        in: dbBanks.map(x => x.id),
      },
    },
  };
  const dbBankAccounts = await db.bankAccountFindMany(whereBankId);
  const dbTrueLayerTokens = await db.trueLayerTokenFindMany(whereBankId);
  const dbNordigenTokens = await db.nordigenTokenFindMany(whereBankId);
  const dbStarlingTokens = await db.starlingTokenFindMany(whereBankId);
  const dbDisplaySettings = await db.getDbDisplaySettings();
  return {
    dbBanks,
    dbBankAccounts,
    dbStocks,
    dbTrueLayerTokens,
    dbNordigenTokens,
    dbStarlingTokens,
    dbDisplaySettings,
  };
}

export default async function Page() {
  const userId = await getUserIdOrRedirect();
  const data = await getData(userId);
  return (
    <BanksConfigPage
      dbBanks={data.dbBanks}
      dbBankAccounts={data.dbBankAccounts}
      dbStocks={data.dbStocks}
      dbTrueLayerTokens={data.dbTrueLayerTokens}
      dbNordigenTokens={data.dbNordigenTokens}
      dbStarlingTokens={data.dbStarlingTokens}
      dbDisplaySettings={data.dbDisplaySettings}
    />
  );
}
