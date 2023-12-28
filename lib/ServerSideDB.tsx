import { DB } from "lib/db";
import { addLatestExchangeRates } from "lib/exchangeRatesBackfill";
import { AllDatabaseData } from "lib/model/AllDatabaseDataModel";
import { fetchBalances } from "lib/openbanking/balance";
import { IOpenBankingData } from "lib/openbanking/interface";
import { fetchOpenBankingTransactions } from "lib/openbanking/transactions";
import { addLatestStockQuotes } from "lib/stockQuotesBackfill";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "pages/api/auth/[...nextauth]";

const fetchAllDatabaseData = async (db: DB): Promise<AllDatabaseData> => {
  const dbTransactions = await db.transactionFindMany({
    include: {
      personalExpense: true,
      thirdPartyExpense: true,
      transfer: true,
      income: true,
    },
  });

  return {
    dbTransactions,
    dbBanks: await db.bankFindMany(),
    dbTrips: await db.tripFindMany(),
    dbTags: await db.tagFindMany(),
    dbBankAccounts: await db.bankAccountFindMany(),
    dbCurrencies: await db.currencyFindMany(),
    dbCategories: await db.categoryFindMany(),
    dbExchangeRates: await db.exchangeRateFindMany(),
    dbStockQuotes: await db.stockQuoteFindMany(),
    dbTransactionPrototypes: await db.transactionPrototypeFindMany(),
  };
};

const fetchOpenBankingData = async (db: DB) => {
  return {
    balances: await fetchBalances(db),
    transactions: await fetchOpenBankingTransactions(db),
  };
};

const jsonEncodingHacks = (key: string, value) => {
  if (typeof value === "bigint") {
    if (value > Number.MAX_SAFE_INTEGER) {
      throw new Error(`Number ${value} is too big to serialize as JSON`);
    }
    return value.toString();
  }
  return value;
};

export const allDbDataProps: GetServerSideProps<AllDatabaseData> = async (
  context
) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) {
    return {
      redirect: {
        destination: "/api/auth/signin",
        permanent: false,
      },
    };
  }
  await Promise.all([addLatestExchangeRates(), addLatestStockQuotes()]).catch(
    (reason) => {
      console.warn("Failed to update rates", reason);
    }
  );
  const db = await DB.fromContext(context);
  const dbData = await fetchAllDatabaseData(db);
  const props = Object.assign(dbData, { session });
  return JSON.parse(JSON.stringify({ props }, jsonEncodingHacks));
};

export const allDbDataPropsWithOb: GetServerSideProps<
  AllDatabaseData & IOpenBankingData
> = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) {
    return {
      redirect: {
        destination: "/api/auth/signin",
        permanent: false,
      },
    };
  }
  const db = await DB.fromContext(context);
  const dbData = await fetchAllDatabaseData(db);
  let obData: IOpenBankingData = {
    openBankingData: {
      balances: {},
      transactions: {},
    },
  };
  // TODO: fetch async with page load
  await fetchOpenBankingData(db)
    .then((openBankingData) => (obData = { openBankingData }))
    .catch((err) => console.warn("open banking fail", err));
  const props = Object.assign({ session }, dbData, obData);
  return JSON.parse(JSON.stringify({ props }, jsonEncodingHacks));
};
