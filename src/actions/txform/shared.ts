import {Tag} from '@/lib/model/Tag';
import {
  type TransactionPrototype,
  WithdrawalOrDepositPrototype,
} from '@/lib/txsuggestions/TransactionPrototype';
import {Prisma, Trip} from '@prisma/client';

export async function getOrCreateTrip({
  tx,
  tripName,
  userId,
}: {
  tx: Prisma.TransactionClient;
  tripName: string | null;
  userId: number;
}): Promise<Trip | null> {
  if (!tripName) {
    return null;
  }
  const tripNameAndUser = {name: tripName, userId};
  const existing = await tx.trip.findFirst({where: tripNameAndUser});
  if (existing) {
    return existing;
  }
  return await tx.trip.create({data: tripNameAndUser});
}

export async function connectTags(
  tx: Prisma.TransactionClient,
  data:
    | Prisma.TransactionUncheckedCreateInput
    | Prisma.TransactionUncheckedUpdateInput,
  tagNames: string[],
  userId: number
): Promise<Tag[]> {
  if (!tagNames.length) {
    return [];
  }
  const existing: Tag[] = await tx.tag.findMany({
    where: {
      userId,
      name: {
        in: tagNames,
      },
    },
  });
  const newNames = tagNames.filter(x => existing.every(t => t.name != x));
  const created = await Promise.all(
    newNames.map(name => tx.tag.create({data: {name, userId}}))
  );
  const allTags = [...existing, ...created];
  if (allTags.length) {
    data.tags = {connect: allTags.map(({id}) => ({id}))};
  }
  return allTags;
}

export async function writeUsedProtos({
  protos,
  transactionId,
  userId,
  tx,
}: {
  protos: TransactionPrototype[];
  transactionId: number;
  userId: number;
  tx: Prisma.TransactionClient;
}): Promise<void> {
  if (!protos.length) {
    return;
  }
  // Transfer protos consist of two parts: deposit and withdrawal.
  // Replace all the transfers in the input with their parts to simplify the insert.
  const plainProtos: WithdrawalOrDepositPrototype[] = protos.flatMap(proto =>
    proto.type == 'transfer' ? [proto.deposit, proto.withdrawal] : [proto]
  );
  await tx.transactionPrototype.createMany({
    data: plainProtos.map(
      (proto): Prisma.TransactionPrototypeCreateManyInput => ({
        internalTransactionId: transactionId,
        externalDescription: proto.originalDescription,
        externalId: proto.externalTransactionId,
        userId,
      })
    ),
  });
}

// TODO: move to util and write tests.
export const toCents = (x: number): number => Math.round(x * 100);
