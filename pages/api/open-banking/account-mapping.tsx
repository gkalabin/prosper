import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import { DB } from "lib/db";
import prisma from "lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export interface AccountMappingRequest {
  bankId: number;
  mapping: {
    internalAccountId: number;
    externalAccountId: string;
  }[];
}

async function handle(
  userId: number,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const input: AccountMappingRequest = req.body;
  const { bankId, mapping: mappingRaw } = input;
  const db = new DB({ userId });
  const [bank] = await db.bankFindMany({ where: { id: bankId } });
  if (!bank) {
    return res.status(404).json({ message: "Bank not found" });
  }
  const dbAccounts = await db.bankAccountFindMany({ where: { bankId } });
  const mapping = mappingRaw.filter((m) =>
    dbAccounts.some((a) => a.id === m.internalAccountId)
  );
  const result = await prisma.$transaction(async (tx) => {
    await tx.externalAccountMapping.deleteMany({
      where: {
        internalAccountId: {
          in: dbAccounts.map((x) => x.id),
        },
      },
    });
    await tx.externalAccountMapping.createMany({
      data: mapping.map((m) => ({
        externalAccountId: m.externalAccountId,
        internalAccountId: m.internalAccountId,
        userId,
      })),
    });
    return await tx.externalAccountMapping.findMany({
      where: {
        internalAccountId: {
          in: dbAccounts.map((x) => x.id),
        },
        userId,
      },
    });
  });
  return res.json(result);
}

export default authenticatedApiRoute("POST", handle);
