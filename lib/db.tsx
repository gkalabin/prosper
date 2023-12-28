import { Prisma } from "@prisma/client";
import prisma from "lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "pages/api/auth/[...nextauth]";

export class DB {
  private readonly userId: number;

  public constructor({ userId }: { userId: number }) {
    this.userId = userId;
  }

  static async fromContext(context) {
    const session = await getServerSession(
      context.req,
      context.res,
      authOptions
    );
    if (!session) {
      throw new Error("No session");
    }
    return new DB({ userId: +session.user.id });
  }

  transactionFindMany<T extends Prisma.TransactionFindManyArgs>(
    args?: Prisma.SelectSubset<T, Prisma.TransactionFindManyArgs>
  ): Prisma.PrismaPromise<Array<Prisma.TransactionGetPayload<T>>> {
    return prisma.transaction.findMany(this.whereUser(args));
  }
  transactionFindFirst(args?: Prisma.TransactionFindFirstArgs) {
    return prisma.transaction.findFirst(this.whereUser(args));
  }
  transactionPrototypeFindMany(args?: Prisma.TransactionPrototypeFindManyArgs) {
    return prisma.transactionPrototype.findMany(this.whereUser(args));
  }
  tripFindMany(args?: Prisma.TripFindManyArgs) {
    return prisma.trip.findMany(this.whereUser(args));
  }
  tagFindMany(args?: Prisma.TagFindManyArgs) {
    return prisma.tag.findMany(this.whereUser(args));
  }
  bankUpdate(args?: Prisma.BankUpdateArgs) {
    return prisma.bank.update(args);
  }
  bankFindMany(args?: Prisma.BankFindManyArgs) {
    return prisma.bank.findMany(this.whereUser(args));
  }
  bankAccountFindMany(args?: Prisma.BankAccountFindManyArgs) {
    return prisma.bankAccount.findMany(this.whereUser(args));
  }
  categoryFindMany(args?: Prisma.CategoryFindManyArgs) {
    return prisma.category.findMany(this.whereUser(args));
  }

  currencyFindMany(args?: Prisma.CurrencyFindManyArgs) {
    return prisma.currency.findMany(args);
  }
  stockQuoteFindMany(args?: Prisma.StockQuoteFindManyArgs) {
    return prisma.stockQuote.findMany(args);
  }
  exchangeRateFindMany(args?: Prisma.ExchangeRateFindManyArgs) {
    return prisma.exchangeRate.findMany(args);
  }

  trueLayerTokenFindMany(args?: Prisma.TrueLayerTokenFindManyArgs) {
    return prisma.trueLayerToken.findMany(this.whereUser(args));
  }
  nordigenTokenFindMany(args?: Prisma.NordigenTokenFindFirstArgs) {
    return prisma.nordigenToken.findMany(this.whereUser(args));
  }
  nordigenRequisitionFindFirst(args?: Prisma.NordigenRequisitionFindFirstArgs) {
    return prisma.nordigenRequisition.findFirst(this.whereUser(args));
  }
  starlingTokenFindMany(args?: Prisma.StarlingTokenFindFirstArgs) {
    return prisma.starlingToken.findMany(this.whereUser(args));
  }
  externalAccountMappingFindMany(
    args?: Prisma.ExternalAccountMappingFindManyArgs
  ) {
    return prisma.externalAccountMapping.findMany(this.whereUser(args));
  }

  async getOrCreateDbDisplaySettings() {
    const [existing] = await prisma.displaySettings.findMany(
      this.whereUser({})
    );
    if (existing) {
      return existing;
    }
    const currencies = await this.currencyFindMany();
    if (!currencies.length) {
      throw new Error("Cannot create display settings without currencies");
    }
    const created = await prisma.displaySettings.create({
      data: {
        displayCurrencyId: currencies[0].id,
        excludeCategoryIdsInStats: "",
        userId: this.userId,
      },
    });
    return created;
  }

  getUserId() {
    return this.userId;
  }

  // TODO: add types
  private whereUser(args) {
    const copy = { ...args };
    copy.where = { ...copy.where };
    if (copy.where.userId) {
      throw new Error("User id is already set");
    }
    copy.where.userId = this.userId;
    return copy;
  }
}
