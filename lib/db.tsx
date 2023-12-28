import { Prisma } from "@prisma/client";
import {
  AllDatabaseData,
  TransactionWithExtensionsAndTagIds,
} from "lib/model/AllDatabaseDataModel";
import { Currency } from "lib/model/Currency";
import prisma from "lib/prisma";

export class DB {
  private readonly userId: number;

  public constructor({ userId }: { userId: number }) {
    this.userId = userId;
  }

  transactionFindAll(): Promise<TransactionWithExtensionsAndTagIds[]> {
    return prisma.transaction.findMany({
      where: {
        userId: this.userId,
      },
      include: {
        personalExpense: true,
        thirdPartyExpense: true,
        transfer: true,
        income: true,
        tags: {
          select: {
            id: true,
          },
        },
      },
      // ...args
    });
  }
  transactionById(
    id: number,
  ): Promise<TransactionWithExtensionsAndTagIds | null> {
    return prisma.transaction.findFirst({
      where: {
        id,
        userId: this.userId,
      },
      include: {
        personalExpense: true,
        thirdPartyExpense: true,
        transfer: true,
        income: true,
        tags: {
          select: {
            id: true,
          },
        },
      },
    });
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
  bankUpdate(args: Prisma.BankUpdateArgs) {
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
  nordigenTokenFindMany(args?: Prisma.NordigenTokenFindFirstArgs) {
    return prisma.nordigenToken.findMany(this.whereUser(args ?? {}));
  }
  nordigenRequisitionFindFirst(args?: Prisma.NordigenRequisitionFindFirstArgs) {
    return prisma.nordigenRequisition.findFirst(this.whereUser(args ?? {}));
  }
  starlingTokenFindMany(args?: Prisma.StarlingTokenFindFirstArgs) {
    return prisma.starlingToken.findMany(this.whereUser(args ?? {}));
  }
  externalAccountMappingFindMany(
    args?: Prisma.ExternalAccountMappingFindManyArgs,
  ) {
    return prisma.externalAccountMapping.findMany(this.whereUser(args ?? {}));
  }

  async getOrCreateDbDisplaySettings() {
    const [existing] = await prisma.displaySettings.findMany(
      this.whereUser({}),
    );
    if (existing) {
      return existing;
    }
    const created = await prisma.displaySettings.create({
      data: {
        displayCurrencyCode: Currency.USD.code(),
        excludeCategoryIdsInStats: "",
        userId: this.userId,
      },
    });
    return created;
  }

  getUserId() {
    return this.userId;
  }

  private whereUser<T extends UserIdFilter>(args: T): T {
    const copy = { ...args };
    copy.where = { ...copy.where };
    if (copy.where.userId) {
      throw new Error("User id is already set");
    }
    copy.where.userId = this.userId;
    return copy;
  }
}

type UserIdFilter = { where?: { userId?: number | Prisma.IntFilter<string> } };

export async function fetchAllDatabaseData(db: DB): Promise<AllDatabaseData> {
  const data = {} as AllDatabaseData;
  await Promise.all(
    [
      async () => (data.dbTransactions = await db.transactionFindAll()),
      async () => (data.dbBanks = await db.bankFindMany()),
      async () => (data.dbTrips = await db.tripFindMany()),
      async () => (data.dbTags = await db.tagFindMany()),
      async () => (data.dbBankAccounts = await db.bankAccountFindMany()),
      async () => (data.dbCategories = await db.categoryFindMany()),
      async () =>
        (data.dbDisplaySettings = await db.getOrCreateDbDisplaySettings()),
      async () => (data.dbExchangeRates = await db.exchangeRateFindMany()),
      async () => (data.dbStockQuotes = await db.stockQuoteFindMany()),
      async () => (data.dbStocks = await db.stocksFindMany()),
      async () =>
        (data.dbTransactionPrototypes =
          await db.transactionPrototypeFindMany()),
    ].map((f) => f()),
  );
  return data;
}
