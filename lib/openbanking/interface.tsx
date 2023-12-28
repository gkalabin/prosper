import { TransactionPrototype as DBTransactionPrototype } from "@prisma/client";
import { WithdrawalOrDepositPrototype } from "lib/txsuggestions/TransactionPrototype";

export type IOpenBankingData = {
  balances: AccountBalance[];
  newPrototypes: WithdrawalOrDepositPrototype[];
  usedPrototypes: DBTransactionPrototype[];
};

export interface AccountBalance {
  internalAccountId: number;
  balanceCents: number;
}

export interface AccountDetails {
  externalAccountId: string;
  name: string;
}
