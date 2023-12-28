import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import { DB } from "lib/db";
import prisma from "lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

async function handle(
  userId: number,
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Parse input.
  const accountId = parseInt(req.query.id as string);
  const { name, displayOrder, currencyId } = req.body;
  // Verify user has access.
  const db = new DB({ userId });
  const found = await db.bankAccountFindMany({
    where: {
      id: accountId,
    },
  });
  if (!found?.length) {
    res.status(401).send(`Not authenticated`);
    return;
  }
  // Perform update.
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

export default authenticatedApiRoute("PUT", handle);
