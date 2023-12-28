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
  dbIncome: Income[];
  dbPersonalExpense: PersonalExpense[];
  dbThirdPartyExpense: ThirdPartyExpense[];
  dbTransfer: Transfer[];
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
