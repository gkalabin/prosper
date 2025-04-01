import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {AmountWithUnit} from '@/lib/AmountWithUnit';
import {StockAndCurrencyExchange} from '@/lib/ClientSideModel';
import {Currency} from '@/lib/model/Currency';
import {isCurrency, isStock} from '@/lib/model/Unit';

export function exchangeAmountWithUnit({
  amount,
  target,
  timestampEpoch,
  exchange,
}: {
  amount: AmountWithUnit;
  target: Currency;
  timestampEpoch: number;
  exchange: StockAndCurrencyExchange;
}): AmountWithCurrency | undefined {
  const unit = amount.getUnit();
  if (isCurrency(unit)) {
    const amountWithCurrency = new AmountWithCurrency({
      amountCents: amount.cents(),
      currency: unit,
    });
    return exchange.exchangeCurrency(
      amountWithCurrency,
      target,
      timestampEpoch
    );
  }
  if (isStock(unit)) {
    return exchange.exchangeStock(
      amount.getAmount(),
      unit,
      target,
      timestampEpoch
    );
  }
  throw new Error(`Unknown unit: ${unit}`);
}
