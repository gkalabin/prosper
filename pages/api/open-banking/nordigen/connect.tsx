import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import { DB } from "lib/db";
import { getOrCreateToken } from "lib/openbanking/nordigen/token";
import prisma from "lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import { v4 as uuidv4 } from "uuid";

async function handle(
  userId: number,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const bankId = parseInt(req.query.bankId as string, 10);
  const institutionId = req.query.institutionId;
  const redirectURI = `${process.env.HOST}/api/open-banking/nordigen/connected`;
  const db = new DB({ userId });
  const [bank] = await db.bankFindMany({ where: { id: bankId } });
  if (!bank) {
    return res.status(404).json({ message: "Bank not found" });
  }
  const reference = uuidv4();
  const token = await getOrCreateToken(db, bankId);
  const requisitionResponse = await fetch(
    `https://ob.nordigen.com/api/v2/requisitions/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.access}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        redirect: redirectURI,
        institution_id: institutionId,
        reference,
      }),
    }
  );
  const requisition = await requisitionResponse.json();
  await prisma.nordigenRequisition.create({
    data: {
      id: reference,
      requisitionId: requisition.id,
      userId,
      bankId,
    },
  });
  return res.redirect(requisition.link);
}

export default authenticatedApiRoute("GET", handle);
