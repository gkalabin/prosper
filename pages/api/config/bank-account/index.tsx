import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import prisma from "lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

async function handle(
  userId: number,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { name, displayOrder, bankId, currencyId } = req.body;
  const result = await prisma.bankAccount.create({
    data: {
      name,
      displayOrder,
      bank: { connect: { id: bankId } },
      currency: { connect: { id: currencyId } },
      user: { connect: { id: userId } },
    },
  });
  res.json(result);
}

export default authenticatedApiRoute("POST", handle);
