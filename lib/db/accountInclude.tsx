import { Prisma } from "@prisma/client";

export const makeBankAccountInclude = (): Prisma.BankAccountInclude => {
  return {
    currency: true,
    bank: true,
  };
};
