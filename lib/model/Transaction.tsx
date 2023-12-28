import { Transaction as DBTransaction } from "@prisma/client";
import { Category } from "./Category";
import { Income } from "./Income";
import { PersonalExpense } from "./PersonalExpense";
import { ThirdPartyExpense } from "./ThirdPartyExpense";
import { Transfer } from "./Transfer";

export type Transaction = {
  id: number;
  timestamp: Date;
  description: string;
  amountCents: number;
  category: Category;

  personalExpense?: PersonalExpense;
  thirdPartyExpense?: ThirdPartyExpense;
  income?: Income;
  transfer?: Transfer;
};

export const transactionModelFromDB = (
  dbTransactions: DBTransaction[],
  personalExpenses: PersonalExpense[],
  thirdPartyExpenses: ThirdPartyExpense[],
  transfers: Transfer[],
  incomes: Income[],
  categories: Category[]
): Transaction[] => {
  const out = [];
  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const personalExpenseByTransactionId = Object.fromEntries(
    personalExpenses.map((c) => [c.dbValue.transactionId, c])
  );
  const thirdPartyExpenseByTransactionId = Object.fromEntries(
    thirdPartyExpenses.map((c) => [c.dbValue.transactionId, c])
  );
  const transferByTransactionId = Object.fromEntries(
    transfers.map((c) => [c.dbValue.transactionId, c])
  );
  const incomeByTransactionId = Object.fromEntries(
    incomes.map((c) => [c.dbValue.transactionId, c])
  );
  for (const x of dbTransactions) {
    const { id, timestamp, description, amountCents, categoryId } = x;
    const transactionModel = {
      id: id,
      timestamp: new Date(timestamp),
      description: description,
      amountCents: amountCents,
      category: categoryById[categoryId],
      personalExpense: personalExpenseByTransactionId[id],
      thirdPartyExpense: thirdPartyExpenseByTransactionId[id],
      income: incomeByTransactionId[id],
      transfer: transferByTransactionId[id],
    };
    const extensions = [
      transactionModel.personalExpense,
      transactionModel.thirdPartyExpense,
      transactionModel.income,
      transactionModel.transfer,
    ];
    const definedExtensions = extensions.filter((x) => !!x);
    if (definedExtensions.length != 1) {
      console.error(
        x,
        `Want only one extension, but got ${definedExtensions.length}, ignoring`,
        definedExtensions
      );
      continue;
    }
    out.push(transactionModel);
  }
  return out;
};
