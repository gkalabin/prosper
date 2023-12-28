import { Prisma } from "@prisma/client";
import { makeBankAccountInclude } from "./accountInclude";

export const makeTransactionInclude = (): Prisma.TransactionInclude => {
  return {
    category: true,
    personalExpense: {
      include: {
        account: { include: makeBankAccountInclude() },
      },
    },
    thirdPartyExpense: {
      include: {
        currency: true,
      },
    },
    transfer: {
      include: {
        accountFrom: { include: makeBankAccountInclude() },
        accountTo: { include: makeBankAccountInclude() },
      },
    },
    income: {
      include: {
        account: { include: makeBankAccountInclude() },
      },
    },
  };
};
