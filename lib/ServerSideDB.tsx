import { DB } from "lib/db";
import { addLatestExchangeRates } from "lib/exchangeRatesBackfill";
import { AllDatabaseData } from "lib/model/AllDatabaseDataModel";
import { addLatestStockQuotes } from "lib/stockQuotesBackfill";
import { includeExtensionsAndTags } from "lib/transactionDbUtils";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "pages/api/auth/[...nextauth]";

const fetchAllDatabaseData = async (db: DB): Promise<AllDatabaseData> => {
  const data = {} as AllDatabaseData;
  await Promise.all(
    [
      async () =>
        (data.dbTransactions = await db.transactionFindMany(
          includeExtensionsAndTags
        )),
      async () => (data.dbBanks = await db.bankFindMany()),
      async () => (data.dbTrips = await db.tripFindMany()),
      async () => (data.dbTags = await db.tagFindMany()),
      async () => (data.dbBankAccounts = await db.bankAccountFindMany()),
      async () => (data.dbCurrencies = await db.currencyFindMany()),
      async () => (data.dbCategories = await db.categoryFindMany()),
      async () =>
        (data.dbDisplaySettings = await db.getOrCreateDbDisplaySettings()),
      async () => (data.dbExchangeRates = await db.exchangeRateFindMany()),
      async () => (data.dbStockQuotes = await db.stockQuoteFindMany()),
      async () => (data.dbStocks = await db.stocksFindMany()),
      async () =>
        (data.dbTransactionPrototypes =
          await db.transactionPrototypeFindMany()),
    ].map((f) => f())
  );
  return data;
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
  const timingLabelSuffix = new Date().getTime();
  console.time("allDbDataProps:" + timingLabelSuffix);
  console.time("allDbDataProps:getServerSession:" + timingLabelSuffix);
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) {
    return {
      redirect: {
        destination: "/api/auth/signin",
        permanent: false,
      },
    };
  }
  console.timeEnd("allDbDataProps:getServerSession:" + timingLabelSuffix);
  console.time("allDbDataProps:exchangeRates:" + timingLabelSuffix);
  await Promise.all([addLatestExchangeRates(), addLatestStockQuotes()]).catch(
    (reason) => {
      console.warn("Failed to update rates", reason);
    }
  );
  console.timeEnd("allDbDataProps:exchangeRates:" + timingLabelSuffix);
  console.time("allDbDataProps:fetchAllDatabaseData:" + timingLabelSuffix);
  const db = await DB.fromContext(context);
  const dbData = await fetchAllDatabaseData(db);
  console.timeEnd("allDbDataProps:fetchAllDatabaseData:" + timingLabelSuffix);
  console.time("allDbDataProps:addSession:" + timingLabelSuffix);
  const props = Object.assign(dbData, { session });
  console.timeEnd("allDbDataProps:addSession:" + timingLabelSuffix);
  console.time("allDbDataProps:jsonify:" + timingLabelSuffix);
  const result = JSON.parse(JSON.stringify({ props }, jsonEncodingHacks));
  console.timeEnd("allDbDataProps:jsonify:" + timingLabelSuffix);
  console.timeEnd("allDbDataProps:" + timingLabelSuffix);
  return result;
};
