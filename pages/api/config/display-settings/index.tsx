import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import prisma from "lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

async function handle(
  userId: number,
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Parse input.
  const { displayCurrencyId, excludeCategoryIdsInStats } = req.body;
  // Perform update.
  const result = await prisma.displaySettings.update({
    data: {
      displayCurrencyId,
      excludeCategoryIdsInStats: excludeCategoryIdsInStats.join(","),
    },
    where: { userId },
  });
  res.json(result);
}

export default authenticatedApiRoute("PUT", handle);
