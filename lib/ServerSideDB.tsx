import {
  Bank,
  BankAccount,
  Category,
  Currency,
  ExchangeRate,
  Income,
  PersonalExpense,
  StockQuote,
  ThirdPartyExpense,
  Transaction,
  Transfer,
} from "@prisma/client";
import prisma from "lib/prisma";
import { addLatestExchangeRates } from "lib/exchangeRatesBackfill";
import { addLatestStockQuotes } from "lib/stockQuotesBackfill";

export interface TransactionWithExtensions extends Transaction {
  personalExpense?: PersonalExpense;
  thirdPartyExpense?: ThirdPartyExpense;
  transfer?: Transfer;
  income?: Income;
}

export type AllDatabaseData = {
  dbTransactions: TransactionWithExtensions[];
  dbCategories: Category[];
  dbBanks: Bank[];
  dbBankAccounts: BankAccount[];
  dbCurrencies: Currency[];
  dbExchangeRates: ExchangeRate[];
  dbStockQuotes: StockQuote[];
};

export const loadAllDatabaseData = async () => {
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
  const allData = await loadAllDatabaseData();
  addLatestExchangeRates();
  addLatestStockQuotes();
  return {
    props: JSON.parse(JSON.stringify(allData, jsonEncodingHacks)),
  };
};
