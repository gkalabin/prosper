import { TransactionCompanion } from "./Transaction";


export type PersonalExpense = {
  kind: "PersonalExpense";
  id: number;
  timestampEpoch: number;
  vendor: string;
  amountCents: number;
  companions: TransactionCompanion[];
  note: string;
  accountId: number;
  categoryId: number;
  tagsIds: number[];
  tripId?: number;
  refundGroupTransactionIds: number[];
};
