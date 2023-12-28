import Category from "./Category";
import Income from "./Income";
import PersonalExpense from "./PersonalExpense";
import ThirdPartyExpense from "./ThirdPartyExpense";
import Transfer from "./Transfer";

type Transaction = {
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

export default Transaction;
