import {
  TransactionPrototype as DBTransactionPrototype,
  Prisma,
  Tag,
  Trip,
} from "@prisma/client";
import { TransactionWithExtensions } from "lib/model/AllDatabaseDataModel";
import {
  TransactionPrototype,
  WithdrawalOrDepositPrototype,
} from "lib/txsuggestions/TransactionPrototype";

/** @deprecated */
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
  usedPrototype: TransactionPrototype;
};

export type TransactionAPIResponse = {
  transaction: TransactionWithExtensions;
  trip: Trip;
  tags: Tag[];
  prototypes: DBTransactionPrototype[];
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
}): Promise<Trip> {
  if (![FormMode.PERSONAL, FormMode.EXTERNAL].includes(form.mode)) {
    return null;
  }
  const config = extensionConfigByMode.get(form.mode);
  const extension = data[config.extensionDbField];
  const extensionData = extension.update ?? extension.create;
  if (!form.tripName) {
   extensionData.tripId = null; 
   return null;
  }
  const tripNameAndUser = {
    name: form.tripName,
    userId,
  };
  const existingTrip = await tx.trip.findFirst({ where: tripNameAndUser });
  if (existingTrip) {
    extensionData.tripId = existingTrip.id;
    return null;
  }
  const createdTrip = await tx.trip.create({ data: tripNameAndUser });
  extensionData.tripId = createdTrip.id;
  return createdTrip;
}

export async function writeUsedPrototypes({
  usedPrototype,
  createdTransactionId,
  userId,
  tx,
}: {
  usedPrototype: TransactionPrototype;
  createdTransactionId: number;
  userId: number;
  tx;
}): Promise<{ createdPrototypes: DBTransactionPrototype[] }> {
  if (!usedPrototype) {
    return { createdPrototypes: [] };
  }
  const createSinglePrototype = (proto: WithdrawalOrDepositPrototype) =>
    tx.transactionPrototype.create({
      data: {
        internalTransactionId: createdTransactionId,
        externalId: proto.externalTransactionId,
        externalDescription: proto.originalDescription,
        userId,
      },
    });
  if (usedPrototype.type == "transfer") {
    const created = await Promise.all([
      createSinglePrototype(usedPrototype.deposit),
      createSinglePrototype(usedPrototype.withdrawal),
    ]);
    return { createdPrototypes: created };
  }
  return { createdPrototypes: [await createSinglePrototype(usedPrototype)] };
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
