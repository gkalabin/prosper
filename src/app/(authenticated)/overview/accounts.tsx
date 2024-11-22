'use client';
import {useHideBalancesContext} from '@/app/(authenticated)/overview/context/hide-balances';
import {
  accountBalance,
  transactionBelongsToAccount,
} from '@/app/(authenticated)/overview/modelHelpers';
import {TransactionsList} from '@/components/transactions/TransactionsList';
import {Amount} from '@/lib/Amount';
import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {AmountWithUnit} from '@/lib/AmountWithUnit';
import {assert} from '@/lib/assert';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {useDisplayCurrency} from '@/lib/context/DisplaySettingsContext';
import {BankAccount, accountUnit} from '@/lib/model/BankAccount';
import {mustFindByCode} from '@/lib/model/Currency';
import {Stock} from '@/lib/model/Stock';
import {Income} from '@/lib/model/transaction/Income';
import {PersonalExpense} from '@/lib/model/transaction/PersonalExpense';
import {Transfer} from '@/lib/model/transaction/Transfer';
import {useOpenBankingBalances} from '@/lib/openbanking/context';
import {cn} from '@/lib/utils';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import {useState} from 'react';

export function BankAccountListItem({account}: {account: BankAccount}) {
  const [showExtraDetails, setShowExtraDetails] = useState(false);
  return (
    <div>
      <div
        className="flex cursor-pointer items-center justify-between"
        onClick={() => setShowExtraDetails(!showExtraDetails)}
      >
        <div>{account.name}</div>
        <Balance account={account} />
      </div>
      {showExtraDetails && <BankAccountExtraDetails account={account} />}
    </div>
  );
}

function Balance({account}: {account: BankAccount}) {
  const {balances} = useOpenBankingBalances();
  const {stocks} = useAllDatabaseDataContext();
  const obBalance = balances?.find(b => b.internalAccountId === account.id);
  if (!obBalance) {
    return <LocalOnlyBalance account={account} />;
  }
  const unit = accountUnit(account, stocks);
  const remoteBalance = new AmountWithUnit({
    amountCents: obBalance.balanceCents,
    unit,
  });
  return <BalanceWithRemote account={account} remoteBalance={remoteBalance} />;
}

function LocalOnlyBalance({account}: {account: BankAccount}) {
  const hideBalances = useHideBalancesContext();
  const {transactions, stocks} = useAllDatabaseDataContext();
  if (hideBalances) {
    return null;
  }
  const appBalance = accountBalance(account, transactions, stocks);
  return <div>{appBalance.format()}</div>;
}

function BalanceWithRemote({
  account,
  remoteBalance,
}: {
  account: BankAccount;
  remoteBalance: AmountWithUnit;
}) {
  const hideBalances = useHideBalancesContext();
  const {transactions, stocks} = useAllDatabaseDataContext();
  const localBalance = accountBalance(account, transactions, stocks);
  const delta = localBalance.subtract(remoteBalance);
  return (
    <div className="flex flex-col items-end">
      <div
        className={cn(
          'flex items-center gap-1',
          delta.isZero() ? 'text-green-600' : 'text-red-600'
        )}
      >
        <div>{hideBalances ? '' : localBalance.format()}</div>
        {delta.isZero() && <CheckCircleIcon className="h-4 w-4" />}
      </div>
      {!delta.isZero() && (
        <div className="flex items-center gap-1 text-xs font-light text-muted-foreground">
          {delta.isNegative() ? (
            <ArrowUpIcon className="h-2.5 w-2.5" />
          ) : (
            <ArrowDownIcon className="h-2.5 w-2.5" />
          )}
          {delta.abs().format()}
        </div>
      )}
    </div>
  );
}

const BankAccountExtraDetails = ({account}: {account: BankAccount}) => {
  const {transactions, stocks} = useAllDatabaseDataContext();
  const unit = accountUnit(account, stocks);
  const accountTransactions = transactions.filter(
    (t): t is PersonalExpense | Transfer | Income =>
      transactionBelongsToAccount(t, account)
  );
  return (
    <div className="ml-2 mt-2 space-y-2">
      <div>
        <span className="mr-2 font-medium">Balance</span>
        <BankAccountBalanceInfo account={account} />
      </div>
      {unit.kind == 'stock' && (
        <div>
          <span className="mr-2 font-medium">Price per share</span>
          <PricePerShare stock={unit} />
        </div>
      )}
      <div className="font-medium">Latest transactions</div>
      <TransactionsList transactions={accountTransactions} />
    </div>
  );
};

function PricePerShare({stock}: {stock: Stock}) {
  const {exchange} = useAllDatabaseDataContext();
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

const BankAccountBalanceInfo = ({account}: {account: BankAccount}) => {
  const {transactions, stocks, exchange} = useAllDatabaseDataContext();
  const displayCurrency = useDisplayCurrency();
  const balance = accountBalance(account, transactions, stocks);
  const unit = balance.getUnit();
  const now = new Date();
  if (unit.kind === 'currency' && unit.code === displayCurrency.code) {
    return <>{balance.format()}</>;
  }
  if (unit.kind === 'currency') {
    const amount = new AmountWithCurrency({
      amountCents: balance.getAmount().cents(),
      currency: unit,
    });
    const inDisplayCurrency = exchange.exchangeCurrency(
      amount,
      displayCurrency,
      now
    );
    if (!inDisplayCurrency) {
      return (
        <>
          {balance.format()} /{' '}
          <span className="text-yellow-700">
            Cannot exchange to {displayCurrency.code}
          </span>
        </>
      );
    }
    return (
      <>
        {balance.format()} / {inDisplayCurrency.format()}
      </>
    );
  }
  assert(unit.kind === 'stock');
  const stockCurrency = mustFindByCode(unit.currencyCode);
  const inStockCurrency = exchange.exchangeStock(
    balance.getAmount(),
    unit,
    stockCurrency,
    now
  );
  if (!inStockCurrency) {
    return (
      <>
        {balance.format()} /{' '}
        <span className="text-yellow-700">
          Cannot exchange to {stockCurrency.code}
        </span>
      </>
    );
  }
  if (stockCurrency.code === displayCurrency.code) {
    return (
      <>
        {balance.format()} / {inStockCurrency.format()}
      </>
    );
  }
  const inDisplayCurrency = exchange.exchangeCurrency(
    inStockCurrency,
    displayCurrency,
    now
  );
  if (!inDisplayCurrency) {
    return (
      <>
        {balance.format()} / {inStockCurrency.format()} /{' '}
        <span className="text-yellow-700">
          Cannot exchange to {displayCurrency.code}
        </span>
      </>
    );
  }
  return (
    <>
      {balance.format()} / {inStockCurrency.format()} /{' '}
      {inDisplayCurrency.format()}
    </>
  );
};
