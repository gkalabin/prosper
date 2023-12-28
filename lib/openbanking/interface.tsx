import { TransactionPrototype as DBTransactionPrototype } from "@prisma/client";
import { Amount } from "lib/Amount";
import { WithdrawalOrDepositPrototype } from "lib/txsuggestions/TransactionPrototype";

export type IOpenBankingData = {
  balances: IOBBalancesByAccountId;
  newPrototypes: WithdrawalOrDepositPrototype[];
  usedPrototypes: DBTransactionPrototype[];
};

// OBTransaction represents an open banking transaction from True Layer API.
export interface IOBTransaction {
  amount: number;
  currency: string;
  description: string;
  transaction_id: string;
  true_layer_transaction_id: string;
  provider_transaction_id: string;
  normalised_provider_transaction_id: string;
  merchant_name: string;
  running_balance: { currency: string; amount: number };
  meta: {
    provider_category: string;
    transaction_type: string;
    provider_id: string;
    provider_merchant_name: string;
    counter_party_preferred_name: string;
    user_comments: string;
    transaction_time: string;
    provider_reference: string;
  };
  timestamp: string;
  transaction_type: string;
  transaction_category: string;
  transaction_classification: Array<string>;
  settled: boolean;
}

export interface IOBBalancesByAccountId {
  [bankAccountId: number]: Amount;
}
