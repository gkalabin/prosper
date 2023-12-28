import { Prisma } from "@prisma/client";
import { fillUnitData } from "app/api/config/bank-account/fillUnitData";
import { CreateBankAccountRequest } from "lib/model/forms/BankAccountFormValues";
import prisma from "lib/prisma";
import { getUserId } from "lib/user";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<Response> {
  const userId = await getUserId();
  const { name, displayOrder, bankId, unit, isJoint, initialBalance } =
    (await request.json()) as CreateBankAccountRequest;
  const data: Prisma.BankAccountUncheckedCreateInput = {
    name,
    displayOrder,
    bankId,
    userId,
    joint: isJoint,
    initialBalanceCents: Math.round(initialBalance * 100),
  };
  await fillUnitData(unit, data);
  const result = await prisma.bankAccount.create({
    data: data,
  });
  return NextResponse.json(result);
}
