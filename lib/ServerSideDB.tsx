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

const fetchAllDatabaseData = async (
  db: DB
): Promise<Partial<AllDatabaseData>> => {
  const dbTransactions = await db.transactionFindMany({
    include: {
      personalExpense: true,
      thirdPartyExpense: true,
      transfer: true,
      income: true,
      tags: {
        select: {
          id: true,
        },
      },
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
    dbDisplaySettings: await db.getOrCreateDbDisplaySettings(),
  };
};

const withExchangeData = async (
  data: Partial<AllDatabaseData>,
  {
    db,
    fetchAll,
  }: {
    db: DB;
    fetchAll: boolean;
  }
): Promise<Partial<AllDatabaseData>> => {
  if (fetchAll) {
    return {
      ...data,
      dbExchangeRates: await db.exchangeRateFindMany(),
      dbStockQuotes: await db.stockQuoteFindMany(),
    };
  }
  const dbCurrencies = data.dbCurrencies ?? (await db.currencyFindMany());
  const dbExchangeRates = await db.exchangeRateFindMany({
    orderBy: {
      rateTimestamp: "desc",
    },
    where: {
      currencyToId: 1,
    },
    distinct: ["currencyFromId"],
    take: dbCurrencies.length - 1,
  });
  const dbStockQuotes = await db.stockQuoteFindMany({
    orderBy: {
      quoteTimestamp: "desc",
    },
    distinct: ["exchange", "ticker"],
    take: dbCurrencies.filter((c) => c.name.includes(":")).length,
  });
  return {
    ...data,
    dbCurrencies,
    dbExchangeRates: dbExchangeRates,
    dbStockQuotes: dbStockQuotes,
  };
};

const fetchOpenBankingData = async (db: DB): Promise<IOpenBankingData> => {
  const dbOpenBankingTransactions =
    await db.openBankingTransactionPrototypeFindMany();
  return {
    balances: await fetchBalances(db),
    transactions: await fetchOpenBankingTransactions(db),
    dbOpenBankingTransactions,
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
  let dbData = await fetchAllDatabaseData(db);
  dbData = await withExchangeData(dbData, { db, fetchAll: true });
  const props = { ...dbData, session };
  return JSON.parse(JSON.stringify({ props }, jsonEncodingHacks));
};

export const allDbDataPropsWithOb: GetServerSideProps<
  AllDatabaseData & { openBankingData: IOpenBankingData }
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
  let dbData = await fetchAllDatabaseData(db);
  dbData = await withExchangeData(dbData, { db, fetchAll: true });
  const props = { ...dbData, session, openBankingData: {} as IOpenBankingData };
  // TODO: fetch async with page load
  await fetchOpenBankingData(db)
    .then((openBankingData) => (props.openBankingData = openBankingData))
    .catch((err) => console.warn("Failed to fetch open banking data", err));
  return JSON.parse(JSON.stringify({ props }, jsonEncodingHacks));
};
