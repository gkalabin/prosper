import {
  Bank,
  BankAccount,
  Category,
  Currency,
  Income,
  PersonalExpense,
  ThirdPartyExpense,
  Transaction,
  Transfer,
} from "@prisma/client";
import prisma from "./prisma";

export type AllDatabaseData = {
  dbTransactions: Transaction[];
  dbCategories: Category[];
  dbBanks: Bank[];
  dbBankAccounts: BankAccount[];
  dbCurrencies: Currency[];
  dbIncome: Income[];
  dbPersonalExpense: PersonalExpense[];
  dbThirdPartyExpense: ThirdPartyExpense[];
  dbTransfer: Transfer[];
};

export const loadAllDatabaseData = async () => {
  const dbTransactions = await prisma.transaction.findMany();
  const transactionIds = dbTransactions.map((t) => t.id);
  const txFilter = {
    where: {
      transactionId: {
        in: transactionIds,
      },
    },
  };

  return {
    dbTransactions,
    dbIncome: await prisma.income.findMany(txFilter),
    dbPersonalExpense: await prisma.personalExpense.findMany(txFilter),
    dbThirdPartyExpense: await prisma.thirdPartyExpense.findMany(txFilter),
    dbTransfer: await prisma.transfer.findMany(txFilter),
    dbBanks: await prisma.bank.findMany(),
    dbBankAccounts: await prisma.bankAccount.findMany(),
    dbCurrencies: await prisma.currency.findMany(),
    dbCategories: await prisma.category.findMany(),
  };
};
