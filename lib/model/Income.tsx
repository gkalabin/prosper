import { Income as DBIncome } from "@prisma/client";
import { BankAccount } from "./BankAccount";

export type Income = {
  vendor: string;
  ownShareAmountCents: number;
  account: BankAccount;
  dbValue: DBIncome;
};

export const incomeModelFromDB = (
  dbEntries: DBIncome[],
  bankAccounts: BankAccount[]
): Income[] => {
  const accountById = Object.fromEntries(bankAccounts.map((x) => [x.id, x]));
  return dbEntries.map((x) =>
    Object.assign({}, x, {
      account: accountById[x.accountId],
      dbValue: x,
    })
  );
};
