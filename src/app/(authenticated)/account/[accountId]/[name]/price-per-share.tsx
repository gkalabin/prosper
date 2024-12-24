'use client';
import {Amount} from '@/lib/Amount';
import {useDisplayCurrency} from '@/lib/context/DisplaySettingsContext';
import {useMarketDataContext} from '@/lib/context/MarketDataContext';
import {mustFindByCode} from '@/lib/model/Currency';
import {Stock} from '@/lib/model/Stock';

export function PricePerShare({stock}: {stock: Stock}) {
  const {exchange} = useMarketDataContext();
  const displayCurrency = useDisplayCurrency();
  const now = new Date();
  const stockCurrency = mustFindByCode(stock.currencyCode);
  const one = new Amount({amountCents: 100});
  const rate = exchange.exchangeStock(one, stock, stockCurrency, now);
  if (!rate) {
    return (
      <>
        <span className="text-yellow-700">
          Exchange rate to {stockCurrency.code} is not available
        </span>
      </>
    );
  }
  if (stockCurrency.code === displayCurrency.code) {
    return <>{rate.format()}</>;
  }
  const rateDC = exchange.exchangeCurrency(rate, displayCurrency, now);
  if (!rateDC) {
    return (
      <>
        {rate.format()} /{' '}
        <span className="text-yellow-700">
          Cannot exchange to {displayCurrency.code}
        </span>
      </>
    );
  }
  return (
    <>
      {rate.format()} / {rateDC.format()}
    </>
  );
}
