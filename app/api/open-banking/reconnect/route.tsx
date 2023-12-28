import { DB } from "lib/db";
import {
  AccountBalance,
  ConnectionExpiration,
} from "lib/openbanking/interface";
import { getUserId } from "lib/user";
import { intParam } from "lib/util/searchParams";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

export interface OpenBankingBalances {
  balances: AccountBalance[];
  expirations: ConnectionExpiration[];
}

export async function GET(request: NextRequest): Promise<Response> {
  const query = request.nextUrl.searchParams;
  const bankId = intParam(query.get("bankId"));
  if (!bankId) {
    return new Response(`bankId must be an integer`, { status: 400 });
  }
  const userId = await getUserId();
  const db = new DB({ userId });
  {
    const [token] = await db.trueLayerTokenFindMany({
      where: {
        bankId,
      },
    });
    if (token) {
      return redirect(`/api/open-banking/truelayer/connect?bankId=${bankId}`);
    }
  }
  {
    const [token] = await db.nordigenTokenFindMany({
      where: {
        bankId,
      },
    });
    if (token) {
      const requisition = await db.nordigenRequisitionFindFirst({
        where: {
          bankId,
        },
      });
      return redirect(
        `/api/open-banking/nordigen/connect?bankId=${bankId}&institutionId=${requisition?.institutionId}`,
      );
    }
  }
  return new Response(`Bank is not connected`, { status: 400 });
}
