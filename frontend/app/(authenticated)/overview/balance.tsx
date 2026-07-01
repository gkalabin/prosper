'use client';
import {MaybeHiddenDiv} from '@/app/(authenticated)/overview/hide-balances';
import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {useCurrentBalances} from '@/lib/context/CurrentBalancesContext';
import {useDisplayCurrency} from '@/lib/context/DisplaySettingsContext';
import {useMarketDataContext} from '@/lib/context/MarketDataContext';
import {accountUnit, BankAccount} from '@/lib/model/BankAccount';
import {mustFindByCode} from '@/lib/model/Currency';
import {isStock} from '@/lib/model/Unit';

export function BankBalance({
  amount,
}: {
  amount: AmountWithCurrency | undefined;
}) {
  if (!amount) {
    return null;
  }
  return <MaybeHiddenDiv>{amount.round().format()}</MaybeHiddenDiv>;
}

export function AccountBalance({account}: {account: BankAccount}) {
  const {stocks} = useCoreDataContext();
  const {exchange} = useMarketDataContext();
  const displayCurrency = useDisplayCurrency();
  const unit = accountUnit(account, stocks);
  const nativeCurrency = isStock(unit)
    ? mustFindByCode(unit.currencyCode)
    : unit;
  const balance = useCurrentBalances().of(account);
  const now = Date.now();
  const nativeBalance = exchange.exchange(balance, nativeCurrency, now);
  const nativeCurrencyBalance = nativeBalance ?? balance;
  let displayCurrencyBalance: AmountWithCurrency | undefined = undefined;
  if (
    nativeBalance &&
    nativeCurrency.code != displayCurrency.code &&
    !nativeBalance.isZero()
  ) {
    displayCurrencyBalance = exchange.exchange(balance, displayCurrency, now);
  }
  return (
    <div className="text-right font-mono">
      <MaybeHiddenDiv className="text-sm font-medium">
        {nativeCurrencyBalance.format()}
      </MaybeHiddenDiv>
      {displayCurrencyBalance && (
        <MaybeHiddenDiv className="text-muted-foreground text-xs">
          ≈ {displayCurrencyBalance.format()}
        </MaybeHiddenDiv>
      )}
    </div>
  );
}
