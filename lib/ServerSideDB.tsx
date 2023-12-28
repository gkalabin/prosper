import { addLatestExchangeRates } from "lib/exchangeRatesBackfill";
import { AllDatabaseData } from "lib/model/AllDatabaseDataModel";
import { fetchBalances } from "lib/openbanking/balance";
import { fetchOpenBankingTransactions } from "lib/openbanking/transactions";
import prisma from "lib/prisma";
import { addLatestStockQuotes } from "lib/stockQuotesBackfill";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "pages/api/auth/[...nextauth]";
import { IOpenBankingData } from "./openbanking/interface";

const fetchAllDatabaseData = async ({
  userId,
}: {
  userId: number;
}): Promise<AllDatabaseData> => {
  const dbTransactions = await prisma.transaction.findMany({
    include: {
      personalExpense: true,
      thirdPartyExpense: true,
      transfer: true,
      income: true,
    },
  });

  const whereUserId = { where: { userId } };
  return {
    dbTransactions,
    dbBanks: await prisma.bank.findMany(whereUserId),
    dbBankAccounts: await prisma.bankAccount.findMany(whereUserId),
    dbCurrencies: await prisma.currency.findMany(),
    dbCategories: await prisma.category.findMany(whereUserId),
    dbExchangeRates: await prisma.exchangeRate.findMany(),
    dbStockQuotes: await prisma.stockQuote.findMany(),
    dbTransactionPrototypes: await prisma.transactionPrototype.findMany(
      whereUserId
    ),
  };
};

const fetchOpenBankingData = async ({ userId }: { userId: number }) => {
  return {
    balances: await fetchBalances({ userId }),
    transactions: await fetchOpenBankingTransactions({ userId }),
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

export const allDbDataProps: GetServerSideProps<AllDatabaseData> = async ({
  req,
  res,
}) => {
  const session = await getServerSession(req, res, authOptions);
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
  const dbData = await fetchAllDatabaseData({ userId: +session.user.id });
  const props = Object.assign(dbData, { session });
  return JSON.parse(JSON.stringify({ props }, jsonEncodingHacks));
};

export const allDbDataPropsWithOb: GetServerSideProps<
  AllDatabaseData & IOpenBankingData
> = async ({ req, res }) => {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return {
      redirect: {
        destination: "/api/auth/signin",
        permanent: false,
      },
    };
  }
  const dbData = await fetchAllDatabaseData({ userId: +session.user.id });
  let obData: IOpenBankingData = {
    openBankingData: {
      balances: {},
      transactions: {},
    },
  };
  // TODO: fetch async with page load
  await fetchOpenBankingData({ userId: +session.user.id })
    .then((openBankingData) => (obData = { openBankingData }))
    .catch((err) => console.warn("open banking fail", err));
  const props = Object.assign({ session }, dbData, obData);
  return JSON.parse(JSON.stringify({ props }, jsonEncodingHacks));
};
