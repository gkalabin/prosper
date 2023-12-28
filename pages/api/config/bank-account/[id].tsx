import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import prisma from "lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

async function handle(
  userId: number,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const accountId = parseInt(req.query.id as string);
  const { name, displayOrder, currencyId } = req.body;
  if (!hasAccess({ accountId, userId })) {
    res.status(401).send(`Not authenticated`);
    return;
  }
  const result = await prisma.bankAccount.update({
    data: {
      name,
      displayOrder,
      currencyId,
    },
    where: { id: accountId },
  });
  res.json(result);
}

async function hasAccess({
  accountId,
  userId,
}: {
  accountId: number;
  userId: number;
}): Promise<boolean> {
  const found = await prisma.bankAccount.findFirst({
    where: {
      id: accountId,
      userId,
    },
  });
  return !!found;
}

export default authenticatedApiRoute("PUT", handle);
