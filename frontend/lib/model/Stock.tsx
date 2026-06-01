import {Stock as PbStock} from '@/lib/grpc/gen/prosper/v1/ledger';

// StockKey identifies a stock by its (exchange, ticker) natural key.
export type StockKey = {exchange: string; ticker: string};

export type Stock = {
  kind: 'stock';
  name: string;
  currencyCode: string;
  ticker: string;
  exchange: string;
};

export function stockModelFromDB(init: PbStock): Stock {
  return {
    kind: 'stock',
    name: init.name,
    currencyCode: init.currencyCode,
    ticker: init.ticker,
    exchange: init.exchange,
  };
}

// stockKey is the stable identity of a stock, its (exchange, ticker)
// pair, suitable for map keys and equality checks.
export function stockKey(stock: StockKey): string {
  return `${stock.exchange}:${stock.ticker}`;
}

// stockKeysEqual reports whether two keys denote the same stock.
export function stockKeysEqual(a: StockKey, b: StockKey): boolean {
  return a.exchange === b.exchange && a.ticker === b.ticker;
}

export function formatStock(
  stock: Stock,
  amountDollar: number,
  options?: Intl.NumberFormatOptions
) {
  const amount = Intl.NumberFormat([], options).format(amountDollar);
  return `${amount} ${stock.ticker}`;
}
