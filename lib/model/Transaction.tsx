import Category from "./Category";
import Income from "./Income";
import PersonalExpense from "./PersonalExpense";
import ThirdPartyExpense from "./ThirdPartyExpense";
import Transfer from "./Transfer";

export type DbTransaction = {
  id: number;
  timestamp: number;
  description: string;
  amountCents: number;
  categoryId: number;

  personalExpense?: PersonalExpense;
  thirdPartyExpense?: ThirdPartyExpense;
  income?: Income;
  transfer?: Transfer;
};

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

export const makeTransactionsFromDBModel = (
  dbTransactions: DbTransaction[],
  categories: Category[]
): Transaction[] => {
  const out = [];
  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));
  for (const x of dbTransactions) {
    const {
      id,
      timestamp,
      description,
      amountCents,
      categoryId,
      personalExpense,
      thirdPartyExpense,
      income,
      transfer,
    } = x;
    const extensions = [personalExpense, thirdPartyExpense, income, transfer];
    const definedExtensions = extensions.filter((x) => !!x);
    if (definedExtensions.length != 1) {
      console.error(
        x,
        `Want only one extension, but got ${definedExtensions.length}, ignoring`,
        definedExtensions
      );
      continue;
    }
    out.push({
      id: id,
      timestamp: new Date(timestamp),
      description: description,
      amountCents: amountCents,
      category: categoryById[categoryId],
      personalExpense: personalExpense,
      thirdPartyExpense: thirdPartyExpense,
      income: income,
      transfer: transfer,
    });
  }
  return out;
};
