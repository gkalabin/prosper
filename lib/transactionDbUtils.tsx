import { OpenBankingTransaction, Prisma, Tag, Trip } from "@prisma/client";
import { TransactionWithExtensions } from "lib/model/AllDatabaseDataModel";
import { IOBTransaction } from "lib/openbanking/interface";

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
  otherPartyName: string;
  fromBankAccountId: number;
  toBankAccountId: number;
  payer: string;
  currencyId: number;
  receivedAmount: number;
  isShared: boolean;
  tripName: string;
  tagNames: string[];
  parentTransactionId: number;
};

export type TransactionAPIRequest = {
  form: AddTransactionFormValues;
  usedOpenBankingTransactions: IOBTransaction[];
  suggestedVendor: string;
};

export type TransactionAPIResponse = {
  transaction: TransactionWithExtensions;
  trip: Trip;
  tags: Tag[];
  openBankingTransactions: OpenBankingTransaction[];
};

export const includeExtensions = {
  include: {
    personalExpense: true,
    thirdPartyExpense: true,
    transfer: true,
    income: true,
  },
};

type TransactionDbData = Prisma.TransactionUncheckedCreateInput &
  Prisma.TransactionUncheckedUpdateInput;
type ExtensionDbData =
  | Prisma.PersonalExpenseUncheckedCreateWithoutTransactionInput
  | Prisma.ThirdPartyExpenseUncheckedCreateWithoutTransactionInput
  | Prisma.TransferUncheckedCreateWithoutTransactionInput
  | Prisma.IncomeUncheckedCreateWithoutTransactionInput;

const toCents = (x: number): number => Math.round(x * 100);

export const transactionDbInput = (
  {
    timestamp,
    description,
    amount,
    categoryId,
    parentTransactionId,
  }: AddTransactionFormValues,
  userId: number
): TransactionDbData => {
  return {
    description,
    categoryId,
    userId,
    timestamp: new Date(timestamp).toISOString(),
    amountCents: toCents(amount),
    ...(parentTransactionId && {
      transactionToBeRepayedId: parentTransactionId,
    }),
  };
};

const extensionConfigByMode = new Map<
  FormMode,
  {
    mode: FormMode;
    extensionDbField: string;
    formToDbData: (
      form: AddTransactionFormValues,
      userId: number
    ) => ExtensionDbData;
  }
>(
  [
    {
      mode: FormMode.PERSONAL,
      extensionDbField: "personalExpense",
      formToDbData: (
        { vendor, ownShareAmount, fromBankAccountId, otherPartyName },
        userId: number
      ) => {
        return {
          vendor,
          otherPartyName,
          userId,
          accountId: fromBankAccountId,
          ownShareAmountCents: toCents(ownShareAmount),
        };
      },
    },
    {
      mode: FormMode.EXTERNAL,
      extensionDbField: "thirdPartyExpense",
      formToDbData: (
        { vendor, ownShareAmount, payer, currencyId },
        userId: number
      ) => {
        return {
          vendor,
          payer,
          currencyId,
          userId,
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
      formToDbData: (
        { payer, otherPartyName, ownShareAmount, toBankAccountId },
        userId: number
      ) => {
        return {
          payer,
          otherPartyName,
          userId,
          accountId: toBankAccountId,
          ownShareAmountCents: toCents(ownShareAmount),
        };
      },
    },
  ].map((x) => [x.mode, x])
);

export async function writeTags({
  form,
  userId,
  data,
  tx,
}: {
  form: AddTransactionFormValues;
  userId: number;
  data: TransactionDbData;
  tx;
}): Promise<{ createdTags: Tag[] }> {
  if (!form.tagNames?.length) {
    return { createdTags: [] };
  }
  const found: Tag[] = await tx.tag.findMany({
    where: {
      userId,
      name: {
        in: form.tagNames,
      },
    },
  });
  const foundByName = new Map<string, Tag>(found.map((x) => [x.name, x]));
  const newTagNames = form.tagNames.filter((x) => !foundByName.has(x));
  const createdTags = await Promise.all(
    newTagNames.map((name) => tx.tag.create({ data: { name, userId } }))
  );
  data.tags = {
    connect: [...found, ...createdTags].map((x) => {
      return { id: x.id };
    }),
  };
  return { createdTags };
}

export async function writeTrip({
  form,
  userId,
  data,
  tx,
}: {
  form: AddTransactionFormValues;
  userId: number;
  data: TransactionDbData;
  tx;
}): Promise<{ createdTrip: Trip }> {
  if (
    !(
      form.tripName &&
      [FormMode.PERSONAL, FormMode.EXTERNAL].includes(form.mode)
    )
  ) {
    return { createdTrip: null };
  }
  const config = extensionConfigByMode.get(form.mode);
  const extension = data[config.extensionDbField];
  const extensionData = extension.update ?? extension.create;
  const tripNameAndUser = {
    name: form.tripName,
    userId,
  };
  const existingTrip = await tx.trip.findFirst({ where: tripNameAndUser });
  if (existingTrip) {
    extensionData.tripId = existingTrip.id;
    return { createdTrip: null };
  }
  const createdTrip = await tx.trip.create({ data: tripNameAndUser });
  extensionData.tripId = createdTrip.id;
  return { createdTrip };
}

export async function writeUsedOpenBankingTransactions({
  usedOpenBankingTransactions,
  suggestedVendor,
  createdTransactionId,
  userId,
  tx,
}: {
  usedOpenBankingTransactions: IOBTransaction[];
  createdTransactionId: number;
  userId: number;
  suggestedVendor: string;
  tx;
}): Promise<{ createdOpenBankingTransactions: OpenBankingTransaction[] }> {
  if (!usedOpenBankingTransactions?.length) {
    return { createdOpenBankingTransactions: [] };
  }
  const created = await Promise.all(
    usedOpenBankingTransactions.map((t) =>
      tx.openBankingTransaction.create({
        data: {
          description: t.description,
          transaction_id: t.transaction_id,
          userId,
          recordedAsId: createdTransactionId,
          suggestedVendor,
        },
      })
    )
  );
  return { createdOpenBankingTransactions: created };
}

export function writeExtension({
  form,
  userId,
  data,
  operation,
}: {
  form: AddTransactionFormValues;
  userId: number;
  data: TransactionDbData;
  operation: "create" | "update";
}) {
  const config = extensionConfigByMode.get(form.mode);
  const extensionData = Object.assign(config.formToDbData(form, userId), {
    userId,
  });
  Object.assign(data, {
    [config.extensionDbField]: {
      [operation]: extensionData,
    },
  });
}
