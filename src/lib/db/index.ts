import {
  cachedCoreDataOrFetch,
  cachedMarketDataOrFetch,
  cachedTransactionDataOrFetch,
} from '@/lib/db/cache';
import {CoreData, MarketData, TransactionData} from '@/lib/db/fetch';
import {
  AllDatabaseData,
  TransactionWithTagIds,
} from '@/lib/model/AllDatabaseDataModel';
import prisma from '@/lib/prisma';
import {Prisma} from '@prisma/client';

export class DB {
  private readonly userId: number;

  public constructor({userId}: {userId: number}) {
    this.userId = userId;
  }

  async transactionFindAll(): Promise<TransactionWithTagIds[]> {
    return await prisma.transaction.findMany({
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
  async transactionById(id: number): Promise<TransactionWithTagIds | null> {
    return await prisma.transaction.findFirst({
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
  async transactionPrototypeFindMany(
    args?: Prisma.TransactionPrototypeFindManyArgs
  ) {
    return await prisma.transactionPrototype.findMany(
      this.whereUser(args ?? {})
    );
  }
  async tripFindMany(args?: Prisma.TripFindManyArgs) {
    return await prisma.trip.findMany(this.whereUser(args ?? {}));
  }
  async tagFindMany(args?: Prisma.TagFindManyArgs) {
    return await prisma.tag.findMany(this.whereUser(args ?? {}));
  }
  async bankUpdate(args: Prisma.BankUpdateArgs) {
    return await prisma.bank.update(args);
  }
  async bankFindMany(args?: Prisma.BankFindManyArgs) {
    return await prisma.bank.findMany(this.whereUser(args ?? {}));
  }
  async bankAccountFindMany(args?: Prisma.BankAccountFindManyArgs) {
    return await prisma.bankAccount.findMany(this.whereUser(args ?? {}));
  }
  async categoryFindMany(args?: Prisma.CategoryFindManyArgs) {
    return await prisma.category.findMany(this.whereUser(args ?? {}));
  }

  async stockQuoteFindMany(args?: Prisma.StockQuoteFindManyArgs) {
    return await prisma.stockQuote.findMany(args);
  }
  async stocksFindMany(args?: Prisma.StockFindManyArgs) {
    return await prisma.stock.findMany(args);
  }
  async exchangeRateFindMany(args?: Prisma.ExchangeRateFindManyArgs) {
    return await prisma.exchangeRate.findMany(args);
  }
  async trueLayerTokenFindMany(args?: Prisma.TrueLayerTokenFindManyArgs) {
    return await prisma.trueLayerToken.findMany(this.whereUser(args ?? {}));
  }
  async trueLayerTokenDelete(args: Prisma.TrueLayerTokenDeleteArgs) {
    return await prisma.trueLayerToken.delete(this.whereUser(args));
  }
  async nordigenTokenFindMany(args?: Prisma.NordigenTokenFindFirstArgs) {
    return await prisma.nordigenToken.findMany(this.whereUser(args ?? {}));
  }
  async nordigenTokenDelete(args: Prisma.NordigenTokenDeleteArgs) {
    return await prisma.nordigenToken.delete(this.whereUser(args));
  }
  async nordigenRequisitionFindFirst(
    args: Prisma.NordigenRequisitionFindFirstArgs
  ) {
    return await prisma.nordigenRequisition.findFirst(this.whereUser(args));
  }
  async nordigenRequisitionDelete(args: Prisma.NordigenRequisitionDeleteArgs) {
    return await prisma.nordigenRequisition.delete(this.whereUser(args));
  }
  async starlingTokenFindMany(args?: Prisma.StarlingTokenFindFirstArgs) {
    return await prisma.starlingToken.findMany(this.whereUser(args ?? {}));
  }
  async starlingTokenDelete(args: Prisma.StarlingTokenDeleteArgs) {
    return await prisma.starlingToken.delete(this.whereUser(args));
  }
  async externalAccountMappingFindMany(
    args?: Prisma.ExternalAccountMappingFindManyArgs
  ) {
    return await prisma.externalAccountMapping.findMany(
      this.whereUser(args ?? {})
    );
  }
  async externalAccountMappingDeleteMany(
    args: Prisma.ExternalAccountMappingDeleteManyArgs
  ) {
    return await prisma.externalAccountMapping.deleteMany(this.whereUser(args));
  }

  async getDbDisplaySettings() {
    return await prisma.displaySettings.findFirstOrThrow(this.whereUser({}));
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

export async function fetchAllDatabaseData(db: DB): Promise<AllDatabaseData> {
  let core = {} as CoreData;
  let transaction = {} as TransactionData;
  let market = {} as MarketData;
  const reqId = Math.random().toString(36).slice(2, 7);
  const timeLabel = (label: string) =>
    `[db] ${label} fetch for userId:${db.getUserId()} [${reqId}]`;
  await Promise.all(
    [
      async () => {
        console.time(timeLabel('CoreData'));
        core = await cachedCoreDataOrFetch(db.getUserId());
        console.timeEnd(timeLabel('CoreData'));
      },
      async () => {
        console.time(timeLabel('TransactionData'));
        transaction = await cachedTransactionDataOrFetch(db.getUserId());
        console.timeEnd(timeLabel('TransactionData'));
      },
      async () => {
        console.time(timeLabel('MarketData'));
        market = await cachedMarketDataOrFetch(db.getUserId());
        console.timeEnd(timeLabel('MarketData'));
      },
    ].map(f => f())
  );
  return {
    ...core,
    ...transaction,
    ...market,
  };
}
