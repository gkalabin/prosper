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

export const includeExtensions = {
  include: {
    personalExpense: true,
    thirdPartyExpense: true,
    transfer: true,
    income: true,
  },
};

const toCents = (x: number): number => Math.round(x * 100);

export const transactionDbInput = (
  { timestamp, description, amount, categoryId },
  userId: number
): Prisma.TransactionUncheckedCreateInput &
  Prisma.TransactionUncheckedUpdateInput => {
  return {
    description, categoryId, userId,
    timestamp: new Date(timestamp).toISOString(),
    amountCents: toCents(amount),
  };
};

declare type ExtensionDbDataGenerator = (
  form: AddTransactionFormValues,
  userId: number
) =>
  | Prisma.PersonalExpenseUncheckedCreateWithoutTransactionInput
  | Prisma.ThirdPartyExpenseUncheckedCreateWithoutTransactionInput
  | Prisma.TransferUncheckedCreateWithoutTransactionInput
  | Prisma.IncomeUncheckedCreateWithoutTransactionInput;

const extensionConfigByMode = new Map<FormMode, {
  mode: FormMode;
  extensionDbField: string;
  formToDbData: ExtensionDbDataGenerator;
}>(
  [
    {
      mode: FormMode.PERSONAL,
      extensionDbField: "personalExpense",
      formToDbData: ({ vendor, ownShareAmount, fromBankAccountId }, userId: number) => {
        return {
          vendor, userId,
          accountId: fromBankAccountId,
          ownShareAmountCents: toCents(ownShareAmount),
        };
      },
    },
    {
      mode: FormMode.EXTERNAL,
      extensionDbField: "thirdPartyExpense",
      formToDbData: ({ vendor, ownShareAmount, payer, currencyId }, userId: number) => {
        return {
          vendor, payer, currencyId, userId,
          ownShareAmountCents: toCents(ownShareAmount),
        };
      },
    },
    {
      mode: FormMode.TRANSFER,
      extensionDbField: "transfer",
      formToDbData: (
        { receivedAmount, fromBankAccountId, toBankAccountId },
        userId: number
      ) => {
        return {
          userId,
          accountFromId: fromBankAccountId,
          accountToId: toBankAccountId,
          receivedAmountCents: toCents(receivedAmount),
        };
      },
    },
    {
      mode: FormMode.INCOME,
      extensionDbField: "income",
      formToDbData: ({ vendor, ownShareAmount, toBankAccountId }, userId: number) => {
        return {
          vendor,
          userId,
          accountId: toBankAccountId,
          ownShareAmountCents: toCents(ownShareAmount),
        };
      },
    },
  ].map((x) => [x.mode, x])
);

export async function addExtensionAndTrip({
  form,
  userId,
  data,
  operation,
  tx,
}: {
  form: AddTransactionFormValues;
  userId: number;
  data: Prisma.TransactionUncheckedCreateInput &
  Prisma.TransactionUncheckedUpdateInput;
  operation: "create" | "update";
  tx;
}) {
  const config = extensionConfigByMode.get(form.mode);
  const extensionData = Object.assign(config.formToDbData(form, userId), { userId });
  // attach trip if present
  if (
    form.tripName &&
    [FormMode.PERSONAL, FormMode.EXTERNAL].includes(form.mode)
  ) {
    const tripId = await maybeCreateTrip(tx, form, userId);
    extensionData[config.extensionDbField][operation].tripId = tripId;
  }
  // extend data with the generated extension
  return Object.assign(data, {
    [config.extensionDbField]: {
      [operation]: extensionData,
    },
  });
}

export async function maybeCreateTrip(
  tx,
  form: AddTransactionFormValues,
  userId: number
) {
  if (!form.tripName) {
    return 0;
  }
  const tripNameAndUser = {
    name: form.tripName,
    userId,
  };
  const existingTrip = await tx.trip.findFirst({
    where: tripNameAndUser,
  });
  if (existingTrip) {
    return existingTrip.id;
  }
  const newTrip = await tx.trip.create({
    data: tripNameAndUser,
  });
  return newTrip.id;
}
