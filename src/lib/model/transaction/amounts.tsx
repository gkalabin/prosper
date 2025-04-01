import {Amount} from '@/lib/Amount';
import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {AmountWithUnit} from '@/lib/AmountWithUnit';
import {StockAndCurrencyExchange} from '@/lib/ClientSideModel';
import {Account} from '@/lib/model/Account';
import {Currency} from '@/lib/model/Currency';
import {Stock} from '@/lib/model/Stock';
import {isCurrency, isStock} from '@/lib/model/Unit';
import {Income} from '@/lib/model/transaction/Income';
import {PersonalExpense} from '@/lib/model/transaction/PersonalExpense';
import {ThirdPartyExpense} from '@/lib/model/transaction/ThirdPartyExpense';
import {transactionUnit} from '@/lib/model/transaction/Transaction';

export function paidTotal(
  t: PersonalExpense | ThirdPartyExpense | Income,
  accounts: Account[],
  stocks: Stock[]
): AmountWithUnit {
  return new AmountWithUnit({
    amountCents: t.amountCents,
    unit: transactionUnit(t, accounts, stocks),
  });
}

export function ownShareAmountCentsIgnoreRefunds(
  t: PersonalExpense | ThirdPartyExpense | Income
): number {
  const otherPartiesAmountCents = t.companions
    .map(c => c.amountCents)
    .reduce((a, b) => a + b, 0);
  return t.amountCents - otherPartiesAmountCents;
}

export function ownShareAmountIgnoreRefunds(
  t: PersonalExpense | ThirdPartyExpense | Income,
  accounts: Account[],
  stocks: Stock[]
): AmountWithUnit {
  return new AmountWithUnit({
    amountCents: ownShareAmountCentsIgnoreRefunds(t),
    unit: transactionUnit(t, accounts, stocks),
  });
}

export function amountAllParties(
  t: PersonalExpense | ThirdPartyExpense | Income,
  target: Currency,
  accounts: Account[],
  stocks: Stock[],
  exchange: StockAndCurrencyExchange
): AmountWithCurrency | undefined {
  const unit = transactionUnit(t, accounts, stocks);
  const allParties = new Amount({amountCents: t.amountCents});
  if (isCurrency(unit)) {
    const amount = new AmountWithCurrency({
      amountCents: allParties.cents(),
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
  accounts: Account[],
  stocks: Stock[],
  exchange: StockAndCurrencyExchange
): AmountWithCurrency | undefined {
  const unit = transactionUnit(t, accounts, stocks);
  const ownShare = new Amount({
    amountCents: ownShareAmountCentsIgnoreRefunds(t),
  });

  if (isCurrency(unit)) {
    const amount = new AmountWithCurrency({
      amountCents: ownShare.cents(),
      currency: unit,
    });
    return exchange.exchangeCurrency(amount, target, t.timestampEpoch);
  }
  if (isStock(unit)) {
    return exchange.exchangeStock(ownShare, unit, target, t.timestampEpoch);
  }
  throw new Error(`Unknown unit: ${unit}`);
}
