import { Prisma } from "@prisma/client";
import prisma from "lib/prisma";

export class DB {
  private readonly userId: number;

  public constructor({ userId }: { userId: number }) {
    this.userId = userId;
  }

  bankFindMany(args?: Prisma.BankFindManyArgs) {
    args = this.withWhereUserId(args);
    return prisma.bank.findMany(args);
  }

  categoryFindMany(args?: Prisma.CategoryFindManyArgs) {
    args = this.withWhereUserId(args);
    return prisma.category.findMany(args);
  }

  private withWhereUserId(args) {
    args ??= {};
    args.where ??= {};
    if (args.where.userId) {
        throw new Error("User id is already set");
    }
    return args;
  }
}
