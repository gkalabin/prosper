import { Stock as DBStock } from "@prisma/client";

export type Stock = {
  id: number;
  name: string;
  currencyCode: string;
  ticker: string;
  exchange: string;
};

export function stockModelFromDB(init: DBStock): Stock {
  return {
    id: init.id,
    name: init.name,
    currencyCode: init.currencyCode,
    ticker: init.ticker,
    exchange: init.exchange,
  };
}

export function formatStock(
  stock: Stock,
  amountDollar: number,
  options?: Intl.NumberFormatOptions
) {
  const amount = Intl.NumberFormat([], options).format(amountDollar);
  return `${amount} ${stock.ticker}`;
}
