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
  Transfer
} from "@prisma/client";
import prisma from "lib/prisma";

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
