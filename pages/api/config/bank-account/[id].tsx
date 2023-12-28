import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import prisma from "lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import { User } from "pages/api/user";

async function handle(user: User, req: NextApiRequest, res: NextApiResponse) {
  const id = parseInt(req.query.id as string);
  const { name, displayOrder, currencyId } = req.body;
  const dbArgs = {
    data: {
      name,
      displayOrder,
      currencyId,
    },
    where: { id: id },
    include: {
      currency: true,
    },
  };
  const result = await prisma.bankAccount.update(dbArgs);
  res.json(result);
}

export default authenticatedApiRoute("PUT", handle);
