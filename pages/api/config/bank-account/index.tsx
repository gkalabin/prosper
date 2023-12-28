import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import prisma from "lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

async function handle(
  userName: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { name, displayOrder, bankId, currencyId } = req.body;
  const dbArgs = {
    data: {
      name,
      displayOrder,
      bank: { connect: { id: bankId } },
      currency: { connect: { id: currencyId } },
    },
    include: {
      currency: true,
    },
  };
  const result = await prisma.bankAccount.create(dbArgs);
  res.json(result);
}

export default authenticatedApiRoute("POST", handle);
