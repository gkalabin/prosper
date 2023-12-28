import { Currency as DBCurrency } from "@prisma/client";

export type Currency = {
  id: number;
  name: string;
};

export const currencyModelFromDB = (dbCurrencies: DBCurrency[]): Currency[] => {
  return dbCurrencies;
};
