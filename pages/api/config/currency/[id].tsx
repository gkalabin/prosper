import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import prisma from "lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import { User } from "pages/api/user";

async function handle(user: User, req: NextApiRequest, res: NextApiResponse) {
  const id = parseInt(req.query.id as string);
  const { name } = req.body;
  const result = await prisma.currency.update({
    data: { name },
    where: { id: id },
  });
  res.json(result);
}

export default authenticatedApiRoute("PUT", handle);
