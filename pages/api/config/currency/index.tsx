import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import prisma from "lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import { User } from "pages/api/user";

async function handle(user: User, req: NextApiRequest, res: NextApiResponse) {
  const { name } = req.body;
  const result = await prisma.currency.create({ data: { name } });
  res.json(result);
}

export default authenticatedApiRoute("POST", handle);
