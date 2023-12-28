import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import prisma from "lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

async function handle(
  userName: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { name } = req.body;
  const result = await prisma.currency.create({ data: { name } });
  res.json(result);
}

export default authenticatedApiRoute("POST", handle);
