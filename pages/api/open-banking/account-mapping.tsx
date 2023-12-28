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
  userName: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const input: AccountMappingRequest = req.body;
  const { bankId, mapping } = input;

  console.log(input);

  for (const oba of mapping) {
    console.log("process", oba);
    if (!oba.id) {
      if (!oba.bankAccountId || !oba.openBankingAccountId) {
        continue;
      }
      await prisma.openBankingAccount.create({
        data: {
          openBankingAccountId: oba.openBankingAccountId,
          bankAccountId: oba.bankAccountId,
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
    },
  });
  const result = await prisma.openBankingAccount.findMany({
    where: {
      bankAccountId: {
        in: dbAccounts.map((x) => x.id),
      },
    },
  });
  res.json(result);
}

export default authenticatedApiRoute("POST", handle);
