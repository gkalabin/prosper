import {Amount} from '@/lib/Amount';
import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {AmountWithUnit} from '@/lib/AmountWithUnit';
import {StockAndCurrencyExchange} from '@/lib/ClientSideModel';
import {BankAccount} from '@/lib/model/BankAccount';
import {Currency} from '@/lib/model/Currency';
import {Stock} from '@/lib/model/Stock';
import {isCurrency, isStock} from '@/lib/model/Unit';
import {Income} from '@/lib/model/transaction/Income';
import {PersonalExpense} from '@/lib/model/transaction/PersonalExpense';
import {ThirdPartyExpense} from '@/lib/model/transaction/ThirdPartyExpense';
import {transactionUnit} from '@/lib/model/transaction/Transaction';

export function paidTotal(
  t: PersonalExpense | ThirdPartyExpense | Income,
  bankAccounts: BankAccount[],
  stocks: Stock[]
): AmountWithUnit {
  return new AmountWithUnit({
    amountNanos: t.amountNanos,
    unit: transactionUnit(t, bankAccounts, stocks),
  });
}

export function ownShareAmountNanosIgnoreRefunds(
  t: PersonalExpense | ThirdPartyExpense | Income
): bigint {
  const otherPartiesAmountNanos = t.companions
    .map(c => c.amountNanos)
    .reduce((a, b) => a + b, 0n);
  return t.amountNanos - otherPartiesAmountNanos;
}

export function ownShareAmountIgnoreRefunds(
  t: PersonalExpense | ThirdPartyExpense | Income,
  bankAccounts: BankAccount[],
  stocks: Stock[]
): AmountWithUnit {
  return new AmountWithUnit({
    amountNanos: ownShareAmountNanosIgnoreRefunds(t),
    unit: transactionUnit(t, bankAccounts, stocks),
  });
}

export function amountAllParties(
  t: PersonalExpense | ThirdPartyExpense | Income,
  target: Currency,
  bankAccounts: BankAccount[],
  stocks: Stock[],
  exchange: StockAndCurrencyExchange
): AmountWithCurrency | undefined {
  const unit = transactionUnit(t, bankAccounts, stocks);
  const allParties = new Amount({amountNanos: t.amountNanos});
  if (isCurrency(unit)) {
    const amount = new AmountWithCurrency({
      amountNanos: allParties.nanos(),
      currency: unit,
    });
    return exchange.exchangeCurrency(amount, target, t.timestampEpoch);
  }
  if (isStock(unit)) {
    return exchange.exchangeStock(allParties, unit, target, t.timestampEpoch);
  }
  throw new Error(`Unknown unit: ${unit}`);
}

export function amountOwnShare(
  t: PersonalExpense | ThirdPartyExpense | Income,
  target: Currency,
  bankAccounts: BankAccount[],
  stocks: Stock[],
  exchange: StockAndCurrencyExchange
): AmountWithCurrency | undefined {
  const unit = transactionUnit(t, bankAccounts, stocks);
  const ownShare = new Amount({
    amountNanos: ownShareAmountNanosIgnoreRefunds(t),
  });

  if (isCurrency(unit)) {
    const amount = new AmountWithCurrency({
      amountNanos: ownShare.nanos(),
      currency: unit,
    });
    return exchange.exchangeCurrency(amount, target, t.timestampEpoch);
  }
  if (isStock(unit)) {
    return exchange.exchangeStock(ownShare, unit, target, t.timestampEpoch);
  }
  throw new Error(`Unknown unit: ${unit}`);
}
