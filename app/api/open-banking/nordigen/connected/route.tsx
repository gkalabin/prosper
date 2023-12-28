import { DB } from "lib/db";
import prisma from "lib/prisma";
import { getUserId } from "lib/user";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest): Promise<Response> {
  const ref = request.nextUrl.searchParams.get("ref");
  if (!ref) {
    return new Response(`ref is missing`, { status: 400 });
  }
  const userId = await getUserId();
  const db = new DB({ userId });
  const requisition = await db.nordigenRequisitionFindFirst({
    where: { id: ref },
  });
  if (!requisition) {
    return new Response(`Requisition not found`, { status: 404 });
  }
  const [bank] = await db.bankFindMany({ where: { id: requisition.bankId } });
  if (!bank) {
    console.warn("Bank not found for requisition", requisition);
    return new Response(`Requisition not found`, { status: 404 });
  }
  await prisma.nordigenRequisition.update({
    data: {
      completed: true,
    },
    where: {
      id: requisition.id,
    },
  });
  return redirect(`/config/open-banking/mapping?bankId=${bank.id}`);
}
