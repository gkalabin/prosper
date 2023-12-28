import {
  TransactionPrototype as DBTransactionPrototype,
  Prisma,
  Tag,
  TransactionType,
  Trip,
} from "@prisma/client";
import { TransactionWithTagIds } from "lib/model/AllDatabaseDataModel";
import {
  FormMode,
  TransactionFormValues,
} from "lib/model/forms/TransactionFormValues";
import {
  TransactionPrototype,
  WithdrawalOrDepositPrototype,
} from "lib/txsuggestions/TransactionPrototype";

export type TransactionAPIRequest = {
  form: TransactionFormValues;
  usedPrototype: TransactionPrototype | null;
};

export type TransactionAPIResponse = {
  transaction: TransactionWithTagIds;
  trip: Trip | null;
  tags: Tag[];
  prototypes: DBTransactionPrototype[];
};

export const includeTagIds = {
  include: {
    tags: {
      select: {
        id: true,
      },
    },
  },
};

const toCents = (x: number): number => Math.round(x * 100);

type CommonCreateAndUpdateInput = Prisma.TransactionUncheckedCreateInput &
  Prisma.TransactionUncheckedUpdateInput;

export function commonTransactionDbData(
  {
    timestamp,
    description,
    amount,
    categoryId,
    parentTransactionId,
    mode,
    vendor,
    otherPartyName,
    ownShareAmount,
    fromBankAccountId,
    toBankAccountId,
    receivedAmount,
    payer,
    currencyCode,
  }: TransactionFormValues,
  userId: number,
): CommonCreateAndUpdateInput {
  const result: CommonCreateAndUpdateInput = {
    description,
    categoryId,
    userId,
    timestamp: new Date(timestamp).toISOString(),
    amountCents: toCents(amount),
    ...(parentTransactionId && {
      transactionToBeRepayedId: parentTransactionId,
    }),
    vendor: null,
    otherPartyName: null,
    ownShareAmountCents: null,
    outgoingAccountId: null,
    outgoingAmountCents: null,
    incomingAccountId: null,
    incomingAmountCents: null,
    payer: null,
    currencyCode: null,
    payerOutgoingAmountCents: null,
  };
  switch (mode) {
    case FormMode.PERSONAL:
      return {
        ...result,
        transactionType: TransactionType.PERSONAL_EXPENSE,
        vendor,
        otherPartyName,
        ownShareAmountCents: toCents(ownShareAmount),
        outgoingAccountId: fromBankAccountId,
        outgoingAmountCents: toCents(amount),
      };
    case FormMode.EXTERNAL:
      return {
        ...result,
        transactionType: TransactionType.THIRD_PARTY_EXPENSE,
        vendor,
        payer,
        currencyCode,
        ownShareAmountCents: toCents(ownShareAmount),
        payerOutgoingAmountCents: toCents(amount),
      };
    case FormMode.TRANSFER:
      return {
        ...result,
        transactionType: TransactionType.TRANSFER,
        outgoingAccountId: fromBankAccountId,
        outgoingAmountCents: toCents(amount),
        incomingAccountId: toBankAccountId,
        incomingAmountCents: toCents(receivedAmount),
      };
    case FormMode.INCOME:
      return {
        ...result,
        transactionType: TransactionType.INCOME,
        incomingAccountId: toBankAccountId,
        incomingAmountCents: toCents(amount),
        payer,
        otherPartyName,
        ownShareAmountCents: toCents(ownShareAmount),
      };
    default:
      const _exhaustiveCheck: never = mode;
      throw new Error(`Unknown mode ${_exhaustiveCheck}`);
  }
}

export async function fetchOrCreateTags(
  tx: Prisma.TransactionClient,
  tagNames: string[],
  userId: number,
): Promise<{ existing: Tag[]; created: Tag[] }> {
  if (!tagNames.length) {
    return { existing: [], created: [] };
  }
  const existing: Tag[] = await tx.tag.findMany({
    where: {
      userId,
      name: {
        in: tagNames,
      },
    },
  });
  const newNames = tagNames.filter((x) => existing.every((t) => t.name != x));
  const created = await Promise.all(
    newNames.map((name) => tx.tag.create({ data: { name, userId } })),
  );
  return { existing, created };
}

export async function writeTrip({
  form,
  userId,
  data,
  tx,
}: {
  form: TransactionFormValues;
  userId: number;
  data:
    | Prisma.TransactionUncheckedCreateInput
    | Prisma.TransactionUncheckedUpdateInput;
  tx: Prisma.TransactionClient;
}): Promise<Trip | null> {
  if (
    ![FormMode.PERSONAL, FormMode.EXTERNAL].includes(form.mode) ||
    !form.tripName
  ) {
    data.tripId = null;
    return null;
  }
  const tripNameAndUser = {
    name: form.tripName,
    userId,
  };
  const existingTrip = await tx.trip.findFirst({ where: tripNameAndUser });
  if (existingTrip) {
    data.tripId = existingTrip.id;
    return null;
  }
  const createdTrip = await tx.trip.create({ data: tripNameAndUser });
  data.tripId = createdTrip.id;
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
  tx: Prisma.TransactionClient;
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
