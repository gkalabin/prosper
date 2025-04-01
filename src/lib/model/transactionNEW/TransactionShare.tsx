import {AmountPlain as Amount} from '@/lib/model/Amount';

export type TransactionShare = {
  name: string;
  accountId: number;
  // The companion's share in the transaction.
  // For example, if the companion paid $1000 mortgage payment and it's shared with the user, the companionShare is $500.
  companionShare: Amount;
  // The amount that actually cleared (received or paid) on their account. For example, how much they paid
  transactedAmount: Amount;
};
