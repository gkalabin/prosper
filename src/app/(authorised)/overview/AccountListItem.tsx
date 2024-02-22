'use client';
import {
  accountBalance,
  transactionBelongsToAccount,
} from '@/app/(authorised)/overview/modelHelpers';
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
import {onTransactionChange} from '@/lib/stateHelpers';
import {useState} from 'react';

export const BankAccountListItem = ({account}: {account: BankAccount}) => {
  const [showExtraDetails, setShowExtraDetails] = useState(false);
  const {transactions, stocks} = useAllDatabaseDataContext();
  const appBalance = accountBalance(account, transactions, stocks);
  const unit = accountUnit(account, stocks);
  let balanceText = <span>{appBalance.format()}</span>;
  const {balances} = useOpenBankingBalances();
  const obBalance = balances?.find(b => b.internalAccountId === account.id);
  if (obBalance) {
    const obAmount = new AmountWithUnit({
      amountCents: obBalance.balanceCents,
      unit,
    });
    const delta = appBalance.subtract(obAmount);
    if (delta.isZero()) {
      balanceText = (
        <span className="text-green-600">{appBalance.format()}</span>
      );
    } else {
      balanceText = (
        <>
          <span className="text-red-600">{appBalance.format()}</span>{' '}
          {delta.abs().format()} unaccounted{' '}
          {delta.isNegative() ? 'income' : 'expense'}
        </>
      );
    }
  }
  return (
    <div className="flex flex-col py-2 pl-6 pr-2">
      <div
        className="cursor-pointer"
        onClick={() => setShowExtraDetails(!showExtraDetails)}
      >
        <span className="text-base font-normal">{account.name}</span>
        <span className="ml-2 text-sm font-light">{balanceText}</span>
      </div>
      {showExtraDetails && <BankAccountExtraDetails account={account} />}
    </div>
  );
};

const BankAccountExtraDetails = ({account}: {account: BankAccount}) => {
  const {setDbData, transactions, stocks} = useAllDatabaseDataContext();
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
      <TransactionsList
        transactions={accountTransactions}
        onTransactionUpdated={onTransactionChange(setDbData)}
      />
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
