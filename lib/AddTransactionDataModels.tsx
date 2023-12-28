import { Prisma } from "@prisma/client";
import { makeTransactionInclude } from "./db/transactionInclude";

export enum FormMode {
  PERSONAL,
  EXTERNAL,
  TRANSFER,
  INCOME,
}

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
};

export type AddTransactionDTO = {
  mode: FormMode;
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
  form: AddTransactionFormValues
): AddTransactionDTO => {
  const out: AddTransactionDTO = {
    mode: mode,
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

export const dtoToDb = (
  dto: AddTransactionDTO
): Prisma.TransactionCreateArgs => {
  const dbArgs: Prisma.TransactionCreateArgs = {
    data: {
      timestamp: new Date(dto.timestamp),
      description: dto.description,
      amountCents: dto.amountCents,
      category: {
        connect: {
          id: dto.categoryId,
        },
      },
    },
  };
  dbArgs.include = makeTransactionInclude();
  if (dto.mode == FormMode.PERSONAL) {
    dbArgs.data.personalExpense = {
      create: {
        vendor: dto.personalTransaction.vendor,
        ownShareAmountCents: dto.personalTransaction.ownShareAmountCents,
        account: {
          connect: {
            id: dto.personalTransaction.bankAccountId,
          },
        },
      },
    };
  }
  if (dto.mode == FormMode.EXTERNAL) {
    dbArgs.data.thirdPartyExpense = {
      create: {
        vendor: dto.externalTransaction.vendor,
        ownShareAmountCents: dto.externalTransaction.ownShareAmountCents,
        payer: dto.externalTransaction.payer,
        currency: {
          connect: {
            id: dto.externalTransaction.currencyId,
          },
        },
      },
    };
  }
  if (dto.mode == FormMode.TRANSFER) {
    dbArgs.data.transfer = {
      create: {
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
      },
    };
  }
  if (dto.mode == FormMode.INCOME) {
    dbArgs.data.income = {
      create: {
        vendor: dto.incomeTransaction.vendor,
        ownShareAmountCents: dto.incomeTransaction.ownShareAmountCents,
        account: {
          connect: {
            id: dto.incomeTransaction.bankAccountId,
          },
        },
      },
    };
  }
  return dbArgs;
};
