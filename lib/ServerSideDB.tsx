import { addLatestExchangeRates } from "lib/exchangeRatesBackfill";
import { fetchBalances } from "lib/openbanking/balance";
import prisma from "lib/prisma";
import { addLatestStockQuotes } from "lib/stockQuotesBackfill";
import { fetchOpenBankingTransactions } from "./openbanking/transactions";

const loadAllDatabaseData = async () => {
  const dbTransactions = await prisma.transaction.findMany({
    include: {
      personalExpense: true,
      thirdPartyExpense: true,
      transfer: true,
      income: true,
    },
  });

  return {
    dbTransactions,
    dbBanks: await prisma.bank.findMany(),
    dbBankAccounts: await prisma.bankAccount.findMany(),
    dbCurrencies: await prisma.currency.findMany(),
    dbCategories: await prisma.category.findMany(),
    dbExchangeRates: await prisma.exchangeRate.findMany(),
    dbStockQuotes: await prisma.stockQuote.findMany(),
  };
};

Date.prototype.toJSON = function () {
  return this.getTime();
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

export const allDbDataProps = async () => {
  await Promise.all([addLatestExchangeRates(), addLatestStockQuotes()]).catch(
    (reason) => {
      console.warn("Failed to update rates", reason);
    }
  );
  const allData = await loadAllDatabaseData();
  const out = {
    props: allData,
  };
  return JSON.parse(JSON.stringify(out, jsonEncodingHacks));
};

export const allDbDataPropsWithOb = async () => {
  const out = await allDbDataProps();
  out.props.obData = {
    balances: await fetchBalances(),
    transactions: await fetchOpenBankingTransactions(),
  };
  return JSON.parse(JSON.stringify(out, jsonEncodingHacks));
};
