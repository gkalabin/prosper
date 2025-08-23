'use client';
import {Button} from '@/components/ui/button';
import {AmountWithUnit} from '@/lib/AmountWithUnit';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {useDisplayCurrency} from '@/lib/context/DisplaySettingsContext';
import {
  accountUnit,
  fullAccountName,
  mustFindAccount,
} from '@/lib/model/Account';
import {findAllPartiesAmount} from '@/lib/model/queries/TransactionAmount';
import {Transaction} from '@/lib/model/transactionNEW/Transaction';
import {format} from 'date-fns';
import {useState} from 'react';

export const TransactionTitle = ({t}: {t: Transaction}) => {
  const {banks, stocks, accounts} = useCoreDataContext();
  const date = format(t.timestampEpoch, 'MMM dd');
  if (t.kind === 'TRANSFER') {
    const from = mustFindAccount(t.fromAccountId, accounts);
    const to = mustFindAccount(t.toAccountId, accounts);
    const sent = new AmountWithUnit({
      amountCents: t.sentAmount.cents,
      unit: accountUnit(from, stocks),
    });
    const received = new AmountWithUnit({
      amountCents: t.receivedAmount.cents,
      unit: accountUnit(from, stocks),
    });
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
  if (t.kind === 'EXPENSE') {
    return (
      <>
        [{date}] {t.vendor} {findAllPartiesAmount({t, stocks}).format()}
      </>
    );
  }
  if (t.kind === 'INCOME') {
    return (
      <>
        [{date}] {t.payer} +{findAllPartiesAmount({t, stocks}).format()}
      </>
    );
  }
  if (t.kind === 'INITIAL_BALANCE') {
    const account = mustFindAccount(t.accountId, accounts);
    return <>Initial balance of {fullAccountName(account, banks)}</>;
  }
  if (t.kind === 'NOOP') {
    return <>Noop transaction ({t.transactionId})</>;
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
          <li key={t.transactionId}>
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
