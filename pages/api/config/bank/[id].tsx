import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import { DB } from "lib/db";
import type { NextApiRequest, NextApiResponse } from "next";

async function handle(
  userId: number,
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Parse input.
  const bankId = parseInt(req.query.id as string);
  const { name, displayOrder } = req.body;
  // Verify user has access.
  const db = new DB({ userId });
  const found = await db.bankFindMany({
    where: {
      id: bankId,
    },
  });
  if (!found?.length) {
    res.status(401).send(`Not authenticated`);
    return;
  }
  // Perform update.
  const result = await db.bankUpdate({
    data: { name, displayOrder },
    where: { id: bankId },
  });
  res.json(result);
}

export default authenticatedApiRoute("PUT", handle);
