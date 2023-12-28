import { Transfer as DBTransfer } from "@prisma/client";
import { BankAccount } from "./BankAccount";
export type Transfer = {
  receivedAmountCents: number;
  accountFrom: BankAccount;
  accountTo: BankAccount;
  dbValue: DBTransfer;
};

export const transferModelFromDB = (
  dbEntries: DBTransfer[],
  bankAccounts: BankAccount[]
): Transfer[] => {
  const accountById = Object.fromEntries(bankAccounts.map((x) => [x.id, x]));
  return dbEntries.map((x) =>
    Object.assign({}, x, {
      accountFrom: accountById[x.accountFromId],
      accountTo: accountById[x.accountToId],
      dbValue: x,
    })
  );
};
