import {DatabaseUpdates} from '@/actions/txform/types';
import {
  type TransactionPrototype,
  WithdrawalOrDepositPrototype,
} from '@/lib/txsuggestions/TransactionPrototype';
import {Prisma, Tag, Trip} from '@prisma/client';

export type CreateInput = Prisma.TransactionUncheckedCreateInput;

export type UpdateInput = Prisma.TransactionUncheckedUpdateInput;

export function includeTagIds() {
  return {
    include: {
      tags: {
        select: {
          id: true,
        },
      },
    },
  };
}

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

async function fetchOrCreateTags(
  tx: Prisma.TransactionClient,
  dbUpdates: DatabaseUpdates,
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
  dbUpdates.tags.push(...created);
  return [...existing, ...created];
}

export async function connectTags(
  tx: Prisma.TransactionClient,
  dbUpdates: DatabaseUpdates,
  data: CreateInput,
  tagNames: string[],
  userId: number
): Promise<void> {
  const allTags = await fetchOrCreateTags(tx, dbUpdates, tagNames, userId);
  data.tags = {connect: allTags.map(({id}) => ({id}))};
}

export async function updateTags(
  tx: Prisma.TransactionClient,
  dbUpdates: DatabaseUpdates,
  data: UpdateInput,
  tagNames: string[],
  userId: number
): Promise<void> {
  const allTags = await fetchOrCreateTags(tx, dbUpdates, tagNames, userId);
  data.tags = {set: allTags.map(({id}) => ({id}))};
}

export async function writeUsedProtos({
  tx,
  dbUpdates,
  protos,
  transactionId,
  userId,
}: {
  tx: Prisma.TransactionClient;
  dbUpdates: DatabaseUpdates;
  protos: TransactionPrototype[];
  transactionId: number;
  userId: number;
}): Promise<void> {
  if (!protos.length) {
    return;
  }
  // Transfer protos consist of two parts: deposit and withdrawal.
  // Replace all the transfers in the input with their parts to simplify the insert.
  const plainProtos: WithdrawalOrDepositPrototype[] = protos.flatMap(proto =>
    proto.type == 'transfer' ? [proto.deposit, proto.withdrawal] : [proto]
  );

  const createSinglePrototype = async (proto: WithdrawalOrDepositPrototype) =>
    await tx.transactionPrototype.create({
      data: {
        internalTransactionId: transactionId,
        externalId: proto.externalTransactionId,
        externalDescription: proto.originalDescription,
        userId,
      },
    });

  const created = await Promise.all(plainProtos.map(createSinglePrototype));
  dbUpdates.prototypes.push(...created);
}

export async function deleteAllLinks(
  tx: Prisma.TransactionClient,
  dbUpdates: DatabaseUpdates,
  transactionId: number
) {
  const links = await tx.transactionLink.findMany({
    where: {
      OR: [
        {sourceTransactionId: transactionId},
        {linkedTransactionId: transactionId},
      ],
    },
  });
  if (links.length) {
    const linkIds = links.map(({id}) => id);
    await tx.transactionLink.deleteMany({where: {id: {in: linkIds}}});
    linkIds.forEach(id => {
      dbUpdates.transactionLinks[id] = null;
    });
  }
}
