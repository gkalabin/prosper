import Category from "./Category";
import PersonalExpense from "./PersonalExpense";

type Transaction = {
  id: number;
  timestamp: Date;
  description: string;
  amountCents: number;
  category: Category;

  personalExpense: PersonalExpense;
};

export default Transaction;
