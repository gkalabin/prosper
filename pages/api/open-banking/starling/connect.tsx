import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import prisma from "lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

async function handle(
  userId: number,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const bankId = parseInt(req.query.bankId as string, 10);
  const token = req.body.token;
  if (!token) {
    return res.status(400).json({ message: "Missing token" });
  }
  await prisma.starlingToken.create({
    data: {
      accessToken: token,
      userId,
      bankId,
    },
  });
  return res.redirect(`/config/open-banking/mapping?bankId=${bankId}`);
}

export default authenticatedApiRoute("POST", handle);
