import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import prisma from "lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export interface AccountMappingRequest {
  bankId: number;
  mapping: {
    id?: string;
    bankAccountId: number;
    openBankingAccountId: string;
  }[];
}

async function handle(
  userId: number,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const input: AccountMappingRequest = req.body;
  const { bankId, mapping } = input;
  const idsToModify = mapping.filter((x) => !!x.id).map((x) => x.id);
  if (!hasAccess({ obaIds: idsToModify, userId })) {
    res.status(401).send(`Not authenticated`);
    return;
  }
  for (const oba of mapping) {
    if (!oba.id) {
      if (!oba.bankAccountId || !oba.openBankingAccountId) {
        continue;
      }
      await prisma.openBankingAccount.create({
        data: {
          openBankingAccountId: oba.openBankingAccountId,
          bankAccountId: oba.bankAccountId,
          userId,
        },
      });
      continue;
    }
    if (!oba.bankAccountId || !oba.openBankingAccountId) {
      await prisma.openBankingAccount.delete({
        where: {
          id: oba.id,
        },
      });
      continue;
    }
    await prisma.openBankingAccount.update({
      where: {
        id: oba.id,
      },
      data: {
        openBankingAccountId: oba.openBankingAccountId,
        bankAccountId: oba.bankAccountId,
      },
    });
  }

  const dbAccounts = await prisma.bankAccount.findMany({
    where: {
      bankId,
      userId,
    },
  });
  const result = await prisma.openBankingAccount.findMany({
    where: {
      bankAccountId: {
        in: dbAccounts.map((x) => x.id),
      },
      userId,
    },
  });
  res.json(result);
}

async function hasAccess({
  obaIds,
  userId,
}: {
  obaIds: string[];
  userId: number;
}): Promise<boolean> {
  if (!obaIds.length) {
    return true;
  }
  const found = await prisma.openBankingAccount.findMany({
    where: {
      id: {
        in: obaIds,
      },
      userId,
    },
  });
  return found.length == obaIds.length;
}

export default authenticatedApiRoute("POST", handle);
