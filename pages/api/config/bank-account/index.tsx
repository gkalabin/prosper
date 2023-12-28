import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import prisma from "lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

async function handle(
  userId: number,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { name, displayOrder, bankId, currencyId, isJoint, initialBalance } =
    req.body;
  const result = await prisma.bankAccount.create({
    data: {
      name,
      displayOrder,
      bankId,
      currencyId,
      userId,
      joint: isJoint,
      initialBalanceCents: Math.round(initialBalance * 100),
    },
  });
  res.json(result);
}

export default authenticatedApiRoute("POST", handle);
