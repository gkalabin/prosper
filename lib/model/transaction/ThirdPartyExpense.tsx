import { TransactionCompanion } from "./Transaction";


export type ThirdPartyExpense = {
  kind: "ThirdPartyExpense";
  id: number;
  timestampEpoch: number;
  payer: string;
  vendor: string;
  amountCents: number;
  currencyCode: string;
  ownShareCents: number;
  companions: TransactionCompanion[];
  note: string;
  categoryId: number;
  tagsIds: number[];
  tripId?: number;
};
