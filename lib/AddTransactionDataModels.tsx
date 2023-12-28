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
};

export type AddTransactionDTO = {
  mode: FormMode;
  transactionId: number;
  description: string;
  timestamp: Date;
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
};

export type ExternalTransactionDTO = {
  vendor: string;
  payer: string;
  ownShareAmountCents: number;
  currencyId: number;
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
    timestamp: new Date(form.timestamp),
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
    };
  }
  if (mode == FormMode.EXTERNAL) {
    out.externalTransaction = {
      ownShareAmountCents: ownShareCents,
      vendor: form.vendor,
      payer: form.payer,
      currencyId: form.currencyId,
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
  //TODO send ts as int
  return out;
};

export const transactionDbInput = (
  dto: AddTransactionDTO
): Prisma.TransactionCreateInput & Prisma.TransactionUpdateInput => {
  return {
    timestamp: new Date(dto.timestamp),
    description: dto.description,
    amountCents: dto.amountCents,
    category: {
      connect: {
        id: dto.categoryId,
      },
    },
  };
};

export const personalExpenseDbInput = (dto: AddTransactionDTO) => {
  return {
    vendor: dto.personalTransaction.vendor,
    ownShareAmountCents: dto.personalTransaction.ownShareAmountCents,
    account: {
      connect: {
        id: dto.personalTransaction.bankAccountId,
      },
    },
  };
};

export const thirdPartyExpenseDbInput = (dto: AddTransactionDTO) => {
  return {
    vendor: dto.externalTransaction.vendor,
    ownShareAmountCents: dto.externalTransaction.ownShareAmountCents,
    payer: dto.externalTransaction.payer,
    currency: {
      connect: {
        id: dto.externalTransaction.currencyId,
      },
    },
  };
};

export const transferDbInput = (dto: AddTransactionDTO) => {
  return {
    receivedAmountCents: dto.transferTransaction.receivedAmountCents,
    accountFrom: {
      connect: {
        id: dto.transferTransaction.fromBankAccountId,
      },
    },
    accountTo: {
      connect: {
        id: dto.transferTransaction.toBankAccountId,
      },
    },
  };
};

export const incomeDbInput = (dto: AddTransactionDTO) => {
  return {
    vendor: dto.incomeTransaction.vendor,
    ownShareAmountCents: dto.incomeTransaction.ownShareAmountCents,
    account: {
      connect: {
        id: dto.incomeTransaction.bankAccountId,
      },
    },
  };
};
