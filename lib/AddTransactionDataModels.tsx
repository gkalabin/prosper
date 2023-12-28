import { Prisma } from "@prisma/client";

export enum FormMode {
  PERSONAL,
  EXTERNAL,
  TRANSFER,
  INCOME,
}

export type AddTransactionFormValues = {
  mode: FormMode;
  timestamp: string;
  description: string;
  amount: number;
  ownShareAmount: number;
  categoryId: number;
  vendor: string;
  fromBankAccountId: number;
  toBankAccountId: number;
  payer: string;
  currencyId: number;
  receivedAmount: number;
  isFamilyExpense: boolean;
  tripName: string;
};

export const transactionDbInput = (
  form: AddTransactionFormValues,
  userId: number
): Prisma.TransactionUncheckedCreateInput &
  Prisma.TransactionUncheckedUpdateInput => {
  return {
    timestamp: new Date(form.timestamp).toISOString(),
    description: form.description,
    amountCents: Math.round(form.amount * 100),
    categoryId: form.categoryId,
    userId,
  };
};

export const personalExpenseDbInput = (
  form: AddTransactionFormValues,
  userId: number
): Prisma.PersonalExpenseUncheckedCreateWithoutTransactionInput => {
  return {
    vendor: form.vendor,
    ownShareAmountCents: Math.round(form.ownShareAmount * 100),
    accountId: form.fromBankAccountId,
    userId,
  };
};

export const thirdPartyExpenseDbInput = (
  form: AddTransactionFormValues,
  userId: number
): Prisma.ThirdPartyExpenseUncheckedCreateWithoutTransactionInput => {
  return {
    vendor: form.vendor,
    ownShareAmountCents: Math.round(form.ownShareAmount * 100),
    payer: form.payer,
    currencyId: form.currencyId,
    userId,
  };
};

export const transferDbInput = (
  form: AddTransactionFormValues,
  userId: number
): Prisma.TransferUncheckedCreateWithoutTransactionInput => {
  return {
    receivedAmountCents: Math.round(form.receivedAmount * 100),
    accountFromId: form.fromBankAccountId,
    accountToId: form.toBankAccountId,
    userId,
  };
};

export const incomeDbInput = (
  form: AddTransactionFormValues,
  userId: number
): Prisma.IncomeUncheckedCreateWithoutTransactionInput => {
  return {
    vendor: form.vendor,
    ownShareAmountCents: Math.round(form.ownShareAmount * 100),
    accountId: form.toBankAccountId,
    userId,
  };
};
