import { addLatestExchangeRates } from "lib/exchangeRatesBackfill";
import { AllDatabaseData } from "lib/model/AllDatabaseDataModel";
import { fetchBalances } from "lib/openbanking/balance";
import { fetchOpenBankingTransactions } from "lib/openbanking/transactions";
import prisma from "lib/prisma";
import { addLatestStockQuotes } from "lib/stockQuotesBackfill";
import { IOpenBankingData } from "./openbanking/interface";

const loadAllDatabaseData = async (): Promise<AllDatabaseData> => {
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
    dbTransactionPrototypes: await prisma.transactionPrototype.findMany(),
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

export const allDbDataProps = async (): Promise<{ props: AllDatabaseData }> => {
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

export const allDbDataPropsWithOb = async (): Promise<{
  props: AllDatabaseData & IOpenBankingData;
}> => {
  const dbData = await allDbDataProps();
  const props = Object.assign(dbData.props, {
    openBankingData: {
      balances: await fetchBalances(),
      transactions: await fetchOpenBankingTransactions(),
    },
  });
  return JSON.parse(JSON.stringify({ props }, jsonEncodingHacks));
};
