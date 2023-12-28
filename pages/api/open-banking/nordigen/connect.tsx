import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import { DB } from "lib/db";
import { getOrCreateToken } from "lib/openbanking/nordigen/token";
import prisma from "lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import { v4 as uuidv4 } from "uuid";

async function handle(
  userId: number,
  req: NextApiRequest,
  res: NextApiResponse,
  db: DB
) {
  const bankId = parseInt(req.query.bankId as string, 10);
  const institutionId = req.query.institutionId;
  if (!institutionId) {
    return res.status(400).send("Missing institutionId");
  }
  const redirectURI = `${process.env.HOST}/api/open-banking/nordigen/connected`;
  const [bank] = await db.bankFindMany({ where: { id: bankId } });
  if (!bank) {
    return res.status(404).json({ message: "Bank not found" });
  }
  const reference = uuidv4();
  const token = await getOrCreateToken(db, bankId);
  const response = await fetch(`https://ob.nordigen.com/api/v2/requisitions/`, {
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
  });
  if (Math.round(response.status / 100) * 100 !== 200) {
    return res
      .status(500)
      .send(
        `Failed to create requisition (status ${
          response.status
        }): ${await response.text()}`
      );
  }
  const requisition = await response.json();
  const data = {
    id: reference,
    requisitionId: requisition.id,
    userId,
    bankId,
  };
  await prisma.nordigenRequisition.upsert({
    create: data,
    update: data,
    where: {
      bankId,
    },
  });
  return res.redirect(requisition.link);
}

export default authenticatedApiRoute("GET", handle);
