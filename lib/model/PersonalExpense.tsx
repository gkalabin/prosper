import { PersonalExpense as DBPersonalExpense } from "@prisma/client";
import { BankAccount } from "./BankAccount";

export type PersonalExpense = {
  vendor: string;
  ownShareAmountCents: number;
  account: BankAccount;
  dbValue: DBPersonalExpense;
};

export const personalExpenseModelFromDB = (
  dbEntries: DBPersonalExpense[],
  bankAccounts: BankAccount[]
): PersonalExpense[] => {
  const accountById = Object.fromEntries(bankAccounts.map((x) => [x.id, x]));
  return dbEntries.map((x) =>
    Object.assign({}, x, {
      account: accountById[x.accountId],
      dbValue: x,
    })
  );
};
