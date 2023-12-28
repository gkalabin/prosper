import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import prisma from "lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

async function handle(
  userName: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { name, displayOrder } = req.body;
  const dbArgs = {
    data: { name, displayOrder },
    include: {
      accounts: {
        include: { currency: true },
      },
    },
  };
  const result = await prisma.bank.create(dbArgs);
  res.json(result);
}

export default authenticatedApiRoute("POST", handle);
