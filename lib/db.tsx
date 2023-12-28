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

  transactionFindMany(args?: Prisma.TransactionFindManyArgs) {
    return prisma.transaction.findMany(this.whereUser(args));
  }
  transactionFindFirst(args?: Prisma.TransactionFindFirstArgs) {
    return prisma.transaction.findFirst(this.whereUser(args));
  }
  transactionPrototypeFindMany(args?: Prisma.TransactionPrototypeFindManyArgs) {
    return prisma.transactionPrototype.findMany(this.whereUser(args));
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
  openBankingAccountFindMany(args?: Prisma.OpenBankingAccountFindManyArgs) {
    return prisma.openBankingAccount.findMany(this.whereUser(args));
  }
  openBankingTokenFindMany(args?: Prisma.OpenBankingTokenFindManyArgs) {
    return prisma.openBankingToken.findMany(this.whereUser(args));
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

  // TODO: add types
  private whereUser(args) {
    args ??= {};
    args.where ??= {};
    if (args.where.userId) {
      throw new Error("User id is already set");
    }
    args.where.userId = this.userId;
    return args;
  }
}
