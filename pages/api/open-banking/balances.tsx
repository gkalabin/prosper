import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import { DB } from "lib/db";
import { fetchBalances, getExpirations } from "lib/openbanking/fetchall";
import {
  AccountBalance,
  ConnectionExpiration,
} from "lib/openbanking/interface";
import type { NextApiRequest, NextApiResponse } from "next";

export interface OpenBankingBalances {
  balances: AccountBalance[];
  expirtations: ConnectionExpiration[];
}

async function handle(
  userId: number,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const db = new DB({ userId });
  const result: OpenBankingBalances = {
    balances: await fetchBalances(db),
    expirtations: await getExpirations(db),
  };
  res.json(result);
}

export default authenticatedApiRoute("GET", handle);
