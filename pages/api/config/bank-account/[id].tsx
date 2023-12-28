import { CreateBankAccountRequest } from "lib/model/api/BankAccountForm";
import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import { DB } from "lib/db";
import prisma from "lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import { fillUnitData } from "pages/api/config/bank-account/index";

async function handle(
  userId: number,
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Parse input.
  const accountId = parseInt(req.query.id as string);
  const { name, displayOrder, unit, isArchived, isJoint, initialBalance } =
    req.body as CreateBankAccountRequest;
  // Verify user has access.
  const db = new DB({ userId });
  const found = await db.bankAccountFindMany({
    where: {
      id: accountId,
    },
  });
  if (!found?.length) {
    res.status(401).send(`Not authenticated`);
    return;
  }
  // Perform update.
  const data = {
    name,
    displayOrder,
    archived: isArchived,
    joint: isJoint,
    initialBalanceCents: Math.round(initialBalance * 100),
  };
  await fillUnitData(unit, data);
  const result = await prisma.bankAccount.update({
    data: data,
    where: { id: accountId },
  });
  res.json(result);
}

export default authenticatedApiRoute("PUT", handle);
