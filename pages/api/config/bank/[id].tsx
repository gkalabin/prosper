import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import prisma from "lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

async function handle(
  userId: number,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const bankId = parseInt(req.query.id as string);
  const { name, displayOrder } = req.body;
  if (!hasAccess({ bankId, userId })) {
    res.status(401).send(`Not authenticated`);
    return;
  }

  const result = await prisma.bank.update({
    data: { name, displayOrder },
    where: { id: bankId },
  });
  res.json(result);
}

async function hasAccess({
  bankId,
  userId,
}: {
  bankId: number;
  userId: number;
}): Promise<boolean> {
  const found = await prisma.bank.findFirst({
    where: {
      id: bankId,
      userId,
    },
  });
  return !!found;
}

export default authenticatedApiRoute("PUT", handle);
