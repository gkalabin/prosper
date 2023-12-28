import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import { DB } from "lib/db";
import prisma from "lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

async function handle(
  userId: number,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const ref = req.query.ref as string;
  const db = new DB({ userId });
  const requisition = await db.nordigenRequisitionFindFirst({
    where: { id: ref },
  });
  if (!requisition) {
    return res.status(404).json({ message: "Requisition not found" });
  }
  const [bank] = await db.bankFindMany({ where: { id: requisition.bankId } });
  if (!bank) {
    console.warn("Bank not found for requisition", requisition);
    return res.status(404).json({ message: "Requisition not found" });
  }
  await prisma.nordigenRequisition.update({
    data: {
      completed: true,
    },
    where: {
      id: requisition.id,
    },
  });
  return res.redirect(
    `/config/open-banking/nordigen/mapping?bankId=${bank.id}`
  );
}

export default authenticatedApiRoute("GET", handle);
