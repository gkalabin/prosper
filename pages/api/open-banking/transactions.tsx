import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import { DB } from "lib/db";
import { fetchTransactions } from "lib/openbanking/fetchall";
import { WithdrawalOrDepositPrototype } from "lib/txsuggestions/TransactionPrototype";
import type { NextApiRequest, NextApiResponse } from "next";

export interface OpenBankingTransactions {
  transactions: WithdrawalOrDepositPrototype[];
}

async function handle(
  userId: number,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const db = new DB({ userId });
  const result: OpenBankingTransactions = {
    transactions: await fetchTransactions(db),
  };
  res.json(result);
}

export default authenticatedApiRoute("GET", handle);
