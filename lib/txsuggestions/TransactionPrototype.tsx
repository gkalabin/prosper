import { Transaction as OpenBankingTransaction } from "lib/openbanking/interface";

export type TransferPrototype = {
  type: "transfer";
  withdrawal: WithdrawalPrototype;
  deposit: DepositPrototype;
};

export interface WithdrawalPrototype extends WithdrawalOrDepositFields {
  type: "withdrawal";
}

export interface DepositPrototype extends WithdrawalOrDepositFields {
  type: "deposit";
}

interface WithdrawalOrDepositFields {
  externalTransactionId: string;
  timestampEpoch: number;
  description: string;
  originalDescription: string;
  absoluteAmountCents: number;
  internalAccountId: number;
}

export type WithdrawalOrDepositPrototype =
  | WithdrawalPrototype
  | DepositPrototype;

export type TransactionPrototype =
  | WithdrawalPrototype
  | DepositPrototype
  | TransferPrototype;

export function fromOpenBankingTransaction(
  t: OpenBankingTransaction
): WithdrawalOrDepositPrototype {
  return {
    type: t.amountCents > 0 ? ("deposit" as const) : ("withdrawal" as const),
    timestampEpoch: new Date(t.timestamp).getTime(),
    description: t.description,
    originalDescription: t.description,
    externalTransactionId: t.externalTransactionId,
    absoluteAmountCents: Math.abs(t.amountCents),
    internalAccountId: t.internalAccountId,
  };
}
