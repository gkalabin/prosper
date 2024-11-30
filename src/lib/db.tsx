import {updateRatesFallback} from '@/lib/asset-rates/backfill';
import {
  AllDatabaseData,
  TransactionWithTagIds,
} from '@/lib/model/AllDatabaseDataModel';
import {USD} from '@/lib/model/Currency';
import prisma from '@/lib/prisma';
import {Prisma} from '@prisma/client';
import {hoursToSeconds} from 'date-fns';
import {revalidateTag, unstable_cache} from 'next/cache';

export class DB {
  private readonly userId: number;

  public constructor({userId}: {userId: number}) {
    this.userId = userId;
  }

  transactionFindAll(): Promise<TransactionWithTagIds[]> {
    return prisma.transaction.findMany({
      where: {
        userId: this.userId,
      },
      include: {
        tags: {
          select: {
            id: true,
          },
        },
      },
    });
  }
  transactionById(id: number): Promise<TransactionWithTagIds | null> {
    return prisma.transaction.findFirst({
      where: {
        id,
        userId: this.userId,
      },
      include: {
        tags: {
          select: {
            id: true,
          },
        },
      },
    });
  }
  async transactionLinkFindAll() {
    const transactionLinks = await prisma.transactionLink.findMany({
      // Where either of the transactions has this user id.
      where: {
        OR: [
          {sourceTransaction: {userId: this.userId}},
          {linkedTransaction: {userId: this.userId}},
        ],
      },
      include: {
        sourceTransaction: true,
        linkedTransaction: true,
      },
    });
    // The links table has no information about the user as individual transactions have their own user id fields.
    // Make sure all of the returned links have the same user id.
    for (const l of transactionLinks) {
      if (l.sourceTransaction.userId != l.linkedTransaction.userId) {
        throw new Error(`Link ${l.id} has different user ids`);
      }
    }
    return transactionLinks;
  }
  transactionPrototypeFindMany(args?: Prisma.TransactionPrototypeFindManyArgs) {
    return prisma.transactionPrototype.findMany(this.whereUser(args ?? {}));
  }
  tripFindMany(args?: Prisma.TripFindManyArgs) {
    return prisma.trip.findMany(this.whereUser(args ?? {}));
  }
  tagFindMany(args?: Prisma.TagFindManyArgs) {
    return prisma.tag.findMany(this.whereUser(args ?? {}));
  }
  async bankUpdate(args: Prisma.BankUpdateArgs) {
    await invalidateCache(this.userId);
    return prisma.bank.update(args);
  }
  bankFindMany(args?: Prisma.BankFindManyArgs) {
    return prisma.bank.findMany(this.whereUser(args ?? {}));
  }
  bankAccountFindMany(args?: Prisma.BankAccountFindManyArgs) {
    return prisma.bankAccount.findMany(this.whereUser(args ?? {}));
  }
  categoryFindMany(args?: Prisma.CategoryFindManyArgs) {
    return prisma.category.findMany(this.whereUser(args ?? {}));
  }

  stockQuoteFindMany(args?: Prisma.StockQuoteFindManyArgs) {
    return prisma.stockQuote.findMany(args);
  }
  stocksFindMany(args?: Prisma.StockFindManyArgs) {
    return prisma.stock.findMany(args);
  }
  exchangeRateFindMany(args?: Prisma.ExchangeRateFindManyArgs) {
    return prisma.exchangeRate.findMany(args);
  }

  trueLayerTokenFindMany(args?: Prisma.TrueLayerTokenFindManyArgs) {
    return prisma.trueLayerToken.findMany(this.whereUser(args ?? {}));
  }
  trueLayerTokenDelete(args: Prisma.TrueLayerTokenDeleteArgs) {
    return prisma.trueLayerToken.delete(this.whereUser(args));
  }
  nordigenTokenFindMany(args?: Prisma.NordigenTokenFindFirstArgs) {
    return prisma.nordigenToken.findMany(this.whereUser(args ?? {}));
  }
  async nordigenTokenDelete(args: Prisma.NordigenTokenDeleteArgs) {
    await invalidateCache(this.userId);
    return prisma.nordigenToken.delete(this.whereUser(args));
  }
  nordigenRequisitionFindFirst(args: Prisma.NordigenRequisitionFindFirstArgs) {
    return prisma.nordigenRequisition.findFirst(this.whereUser(args));
  }
  async nordigenRequisitionDelete(args: Prisma.NordigenRequisitionDeleteArgs) {
    await invalidateCache(this.userId);
    return prisma.nordigenRequisition.delete(this.whereUser(args));
  }
  starlingTokenFindMany(args?: Prisma.StarlingTokenFindFirstArgs) {
    return prisma.starlingToken.findMany(this.whereUser(args ?? {}));
  }
  async starlingTokenDelete(args: Prisma.StarlingTokenDeleteArgs) {
    await invalidateCache(this.userId);
    return prisma.starlingToken.delete(this.whereUser(args));
  }
  externalAccountMappingFindMany(
    args?: Prisma.ExternalAccountMappingFindManyArgs
  ) {
    return prisma.externalAccountMapping.findMany(this.whereUser(args ?? {}));
  }
  async externalAccountMappingDeleteMany(
    args: Prisma.ExternalAccountMappingDeleteManyArgs
  ) {
    await invalidateCache(this.userId);
    return prisma.externalAccountMapping.deleteMany(this.whereUser(args));
  }

  async getOrCreateDbDisplaySettings() {
    const [existing] = await prisma.displaySettings.findMany(
      this.whereUser({})
    );
    if (existing) {
      return existing;
    }
    const created = await prisma.displaySettings.create({
      data: {
        displayCurrencyCode: USD.code,
        excludeCategoryIdsInStats: '',
        userId: this.userId,
      },
    });
    await invalidateCache(this.userId);
    return created;
  }

  getUserId() {
    return this.userId;
  }

  private whereUser<T extends UserIdFilter>(args: T): T {
    const copy = {...args};
    copy.where = {...copy.where};
    if (copy.where.userId) {
      throw new Error('User id is already set');
    }
    copy.where.userId = this.userId;
    return copy;
  }
}

type UserIdFilter = {where?: {userId?: number | Prisma.IntFilter<string>}};

// This is a hack for BigInt serialization requiredd by nextjs unstable_cache.
declare global {
  interface BigInt {
    toJSON(): number;
  }
}
BigInt.prototype.toJSON = function () {
  return Number(this);
};

const getFromCacheOrFetch = unstable_cache(
  async (id: number) => {
    console.log(`[db] CACHE MISS for userId:${id}`);
    const db = new DB({userId: id});
    return await fetchAllDatabaseDataImpl(db);
  },
  [],
  {
    tags: ['all-db-data'],
    // Defense in depth for forgotten cache invalidation.
    revalidate: hoursToSeconds(1),
  }
);

export async function invalidateCache(userId: number) {
  console.log(`[db] INVALIDATE CACHE for userId:${userId}`);
  revalidateTag(`all-db-data`);
}

export async function fetchAllDatabaseData(db: DB): Promise<AllDatabaseData> {
  return await getFromCacheOrFetch(db.getUserId());
}

async function fetchAllDatabaseDataImpl(db: DB): Promise<AllDatabaseData> {
  const data = {} as AllDatabaseData;
  const timeLabel = (label: string) =>
    `[db] ${label} fetch for userId:${db.getUserId()}`;
  await Promise.all(
    [
      async () => {
        console.time(timeLabel('dbTransactions'));
        data.dbTransactions = await db.transactionFindAll();
        console.timeEnd(timeLabel('dbTransactions'));
      },
      async () => {
        console.time(timeLabel('dbTransactionLinks'));
        data.dbTransactionLinks = await db.transactionLinkFindAll();
        console.timeEnd(timeLabel('dbTransactionLinks'));
      },
      async () => {
        console.time(timeLabel('dbBanks'));
        data.dbBanks = await db.bankFindMany();
        console.timeEnd(timeLabel('dbBanks'));
      },
      async () => {
        console.time(timeLabel('dbTrips'));
        data.dbTrips = await db.tripFindMany();
        console.timeEnd(timeLabel('dbTrips'));
      },
      async () => {
        console.time(timeLabel('dbTags'));
        data.dbTags = await db.tagFindMany();
        console.timeEnd(timeLabel('dbTags'));
      },
      async () => {
        console.time(timeLabel('dbBankAccounts'));
        data.dbBankAccounts = await db.bankAccountFindMany();
        console.timeEnd(timeLabel('dbBankAccounts'));
      },
      async () => {
        console.time(timeLabel('dbCategories'));
        data.dbCategories = await db.categoryFindMany();
        console.timeEnd(timeLabel('dbCategories'));
      },
      async () => {
        console.time(timeLabel('dbDisplaySettings'));
        data.dbDisplaySettings = await db.getOrCreateDbDisplaySettings();
        console.timeEnd(timeLabel('dbDisplaySettings'));
      },
      async () => {
        console.time(timeLabel('dbExchangeRates'));
        data.dbExchangeRates = await db.exchangeRateFindMany();
        console.timeEnd(timeLabel('dbExchangeRates'));
      },
      async () => {
        console.time(timeLabel('dbStockQuotes'));
        data.dbStockQuotes = await db.stockQuoteFindMany();
        console.timeEnd(timeLabel('dbStockQuotes'));
      },
      async () => {
        console.time(timeLabel('dbStocks'));
        data.dbStocks = await db.stocksFindMany();
        console.timeEnd(timeLabel('dbStocks'));
      },
      async () => {
        console.time(timeLabel('dbTransactionPrototypes'));
        data.dbTransactionPrototypes = await db.transactionPrototypeFindMany();
        console.timeEnd(timeLabel('dbTransactionPrototypes'));
      },
    ].map(f => f())
  );
  console.time(timeLabel('updateRatesFallback'));
  await updateRatesFallback(data);
  console.timeEnd(timeLabel('updateRatesFallback'));
  return data;
}
