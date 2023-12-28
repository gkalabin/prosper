import { Prisma } from "@prisma/client";

export const makeTransactionInclude = () => {
  const select: Prisma.TransactionInclude = {
    category: true,
    personalExpense: {
      include: {
        account: true,
      },
    },
    thirdPartyExpense: {
      include: {
        currency: true,
      },
    },
    transfer: {
      include: {
        accountFrom: true,
        accountTo: true,
      },
    },
    income: {
      include: {
        account: true,
      },
    },
  };
  return select;
};
