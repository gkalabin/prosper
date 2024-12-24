'use client';
import {Button} from '@/components/ui/button';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {useDisplayCurrency} from '@/lib/context/DisplaySettingsContext';
import {fullAccountName} from '@/lib/model/BankAccount';
import {
  Transaction,
  isIncome,
  isPersonalExpense,
  isThirdPartyExpense,
  isTransfer,
} from '@/lib/model/transaction/Transaction';
import {
  amountReceived,
  amountSent,
  incomingBankAccount,
  outgoingBankAccount,
} from '@/lib/model/transaction/Transfer';
import {paidTotal} from '@/lib/model/transaction/amounts';
import {format} from 'date-fns';
import {useState} from 'react';

export const TransactionTitle = ({t}: {t: Transaction}) => {
  const {banks, stocks, bankAccounts} = useCoreDataContext();
  const date = format(t.timestampEpoch, 'MMM dd');
  if (isTransfer(t)) {
    const from = outgoingBankAccount(t, bankAccounts);
    const to = incomingBankAccount(t, bankAccounts);
    const sent = amountSent(t, bankAccounts, stocks);
    const received = amountReceived(t, bankAccounts, stocks);
    let amountText = sent.format();
    if (sent.cents() !== received.cents()) {
      amountText += `${sent.format()} → ${received.format()}`;
    }
    return (
      <>
        [{date}] {fullAccountName(from, banks)} → {fullAccountName(to, banks)}{' '}
        {amountText}
      </>
    );
  }
  if (isPersonalExpense(t)) {
    return (
      <>
        [{date}] {t.vendor} {paidTotal(t, bankAccounts, stocks).format()}
      </>
    );
  }
  if (isThirdPartyExpense(t)) {
    return (
      <>
        [{date}] {t.vendor} <small>paid by {t.payer}</small>{' '}
        {paidTotal(t, bankAccounts, stocks).format()}
      </>
    );
  }
  if (isIncome(t)) {
    return (
      <>
        [{date}] {t.payer} +{paidTotal(t, bankAccounts, stocks).format()}
      </>
    );
  }
  throw new Error(`Unknown transaction type ${t}`);
};

export function CurrencyExchangeFailed({
  failedTransactions,
}: {
  failedTransactions: Transaction[];
}) {
  const displayCurrency = useDisplayCurrency();
  const [showAll, setShowAll] = useState(false);
  if (!failedTransactions.length) {
    return <></>;
  }
  let visibleTransactions = failedTransactions;
  if (!showAll && failedTransactions.length > 6) {
    visibleTransactions = failedTransactions.slice(0, 5);
  }
  return (
    <div className="rounded border bg-red-100 p-2 text-gray-900">
      <div className="text-lg font-medium">
        Failed to convert the following transactions to {displayCurrency.code},
        these transactions are ignored in the charts:
      </div>
      <ul className="ml-6 list-disc">
        {visibleTransactions.map(t => (
          <li key={t.id}>
            <TransactionTitle t={t} />
          </li>
        ))}
      </ul>
      {failedTransactions.length > visibleTransactions.length && (
        <div>
          And {failedTransactions.length - visibleTransactions.length} more.{' '}
          <Button
            variant="link"
            size="inherit"
            onClick={() => setShowAll(true)}
          >
            Show all
          </Button>
        </div>
      )}
    </div>
  );
}
