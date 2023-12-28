import { Prisma } from "@prisma/client";
import { fail } from "assert";
import { Transaction } from "lib/model/Transaction";

export enum FormMode {
  PERSONAL,
  EXTERNAL,
  TRANSFER,
  INCOME,
}

export const formModeForTransaction = (t?: Transaction) => {
  if (!t) {
    return FormMode.PERSONAL;
  }
  if (t.isPersonalExpense()) {
    return FormMode.PERSONAL;
  }
  if (t.isThirdPartyExpense()) {
    return FormMode.EXTERNAL;
  }
  if (t.isTransfer()) {
    return FormMode.TRANSFER;
  }
  if (t.isIncome()) {
    return FormMode.INCOME;
  }
  fail(`Unknown transaction type for ${t}`);
};

export type AddTransactionFormValues = {
  timestamp: string;
  description: string;
  amount: number;
  ownShareAmount?: number;
  categoryId: number;
  vendor: string;
  fromBankAccountId?: number;
  toBankAccountId?: number;
  payer?: string;
  currencyId?: number;
  receivedAmount?: number;
  isFamilyExpense: boolean;
  tripName: string;
};

export type AddTransactionDTO = {
  mode: FormMode;
  transactionId: number;
  description: string;
  timestamp: number;
  amountCents: number;
  categoryId: number;
  personalTransaction?: PersonalTransactionDTO;
  externalTransaction?: ExternalTransactionDTO;
  transferTransaction?: TransferTransactionDTO;
  incomeTransaction?: IncomeTransactionDTO;
};

export type PersonalTransactionDTO = {
  vendor: string;
  ownShareAmountCents: number;
  bankAccountId: number;
  tripName: string;
};

export type ExternalTransactionDTO = {
  vendor: string;
  payer: string;
  ownShareAmountCents: number;
  currencyId: number;
  tripName: string;
};

export type TransferTransactionDTO = {
  receivedAmountCents: number;
  fromBankAccountId: number;
  toBankAccountId: number;
};

export type IncomeTransactionDTO = {
  vendor: string;
  ownShareAmountCents: number;
  bankAccountId: number;
};

export const formToDTO = (
  mode: FormMode,
  form: AddTransactionFormValues,
  transaction?: Transaction
): AddTransactionDTO => {
  const out: AddTransactionDTO = {
    mode: mode,
    transactionId: transaction?.id,
    timestamp: new Date(form.timestamp).getTime(),
    amountCents: Math.round(form.amount * 100),
    description: form.description,
    categoryId: form.categoryId,
  };

  const ownShareCents = Math.round(form.ownShareAmount * 100);
  if (mode == FormMode.PERSONAL) {
    out.personalTransaction = {
      vendor: form.vendor,
      ownShareAmountCents: ownShareCents,
      bankAccountId: form.fromBankAccountId,
      tripName: form.tripName || null,
    };
  }
  if (mode == FormMode.EXTERNAL) {
    out.externalTransaction = {
      ownShareAmountCents: ownShareCents,
      vendor: form.vendor,
      payer: form.payer,
      currencyId: form.currencyId,
      tripName: form.tripName || null,
    };
  }
  if (mode == FormMode.TRANSFER) {
    out.transferTransaction = {
      receivedAmountCents: Math.round(form.receivedAmount * 100),
      fromBankAccountId: form.fromBankAccountId,
      toBankAccountId: form.toBankAccountId,
    };
  }
  if (mode == FormMode.INCOME) {
    out.incomeTransaction = {
      vendor: form.vendor,
      ownShareAmountCents: ownShareCents,
      bankAccountId: form.toBankAccountId,
    };
  }
  return out;
};

export const transactionDbInput = (
  dto: AddTransactionDTO,
  userId: number
): Prisma.TransactionUncheckedCreateInput &
  Prisma.TransactionUncheckedUpdateInput => {
  return {
    timestamp: new Date(dto.timestamp).toISOString(),
    description: dto.description,
    amountCents: dto.amountCents,
    categoryId: dto.categoryId,
    userId,
  };
};

export const personalExpenseDbInput = (
  { personalTransaction }: AddTransactionDTO,
  userId: number
): Prisma.PersonalExpenseUncheckedCreateWithoutTransactionInput => {
  return {
    vendor: personalTransaction.vendor,
    ownShareAmountCents: personalTransaction.ownShareAmountCents,
    accountId: personalTransaction.bankAccountId,
    userId,
  };
};

export const thirdPartyExpenseDbInput = (
  { externalTransaction }: AddTransactionDTO,
  userId: number
): Prisma.ThirdPartyExpenseUncheckedCreateWithoutTransactionInput => {
  return {
    vendor: externalTransaction.vendor,
    ownShareAmountCents: externalTransaction.ownShareAmountCents,
    payer: externalTransaction.payer,
    currencyId: externalTransaction.currencyId,
    userId,
  };
};

export const transferDbInput = (
  dto: AddTransactionDTO,
  userId: number
): Prisma.TransferUncheckedCreateWithoutTransactionInput => {
  return {
    receivedAmountCents: dto.transferTransaction.receivedAmountCents,
    accountFromId: dto.transferTransaction.fromBankAccountId,
    accountToId: dto.transferTransaction.toBankAccountId,
    userId,
  };
};

export const incomeDbInput = (
  dto: AddTransactionDTO,
  userId: number
): Prisma.IncomeUncheckedCreateWithoutTransactionInput => {
  return {
    vendor: dto.incomeTransaction.vendor,
    ownShareAmountCents: dto.incomeTransaction.ownShareAmountCents,
    accountId: dto.incomeTransaction.bankAccountId,
    userId,
  };
};
