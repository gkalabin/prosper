import {Account} from '@/components/txform/shared/Account';
import {Category} from '@/components/txform/shared/Category';
import {Description} from '@/components/txform/shared/Description';
import {NewBalanceNote} from '@/components/txform/shared/NewBalanceNote';
import {Tags} from '@/components/txform/shared/Tags';
import {Timestamp} from '@/components/txform/shared/Timestamp';
import {UpdateCategoryOnDescriptionChange} from '@/components/txform/shared/UpdateCategoryOnChange';
import {
  Amount,
  useAccountUnitsEqual,
} from '@/components/txform/transfer/Amount';
import {AmountReceived} from '@/components/txform/transfer/AmountReceived';
import {UpdateReceivedAmountOnAmountChange} from '@/components/txform/transfer/UpdateReceivedAmountOnAmountChange';
import {TransactionFormSchema} from '@/components/txform/types';
import {assertDefined} from '@/lib/assert';
import {Transaction} from '@/lib/model/transaction/Transaction';
import {useFormContext, useWatch} from 'react-hook-form';

export function TransferForm({transaction}: {transaction: Transaction | null}) {
  const {getValues} = useFormContext<TransactionFormSchema>();
  assertDefined(
    getValues('transfer'),
    'transfer form requires transfer values'
  );
  const isCreatingNewTransaction = !transaction;
  const sameUnit = useAccountUnitsEqual();
  return (
    <>
      <Timestamp fieldName="transfer.timestamp" label="When" />

      <div className="space-y-2">
        <div className="text-foreground text-sm font-medium">Move money</div>
        <div className="grid grid-cols-2 gap-x-3">
          <Account fieldName="transfer.fromAccountId" label="From" />
          <Account fieldName="transfer.toAccountId" label="To" />
        </div>
      </div>

      <div className="space-y-1.5">
        {sameUnit ? (
          <Amount />
        ) : (
          <div className="grid grid-cols-2 gap-x-3">
            <Amount />
            <AmountReceived />
          </div>
        )}
        {/* Wrap balances in a div each to avoid skipping a grid entry when one of the balances is null, e.g. when amount is NaN. */}
        <div className="grid grid-cols-2 gap-x-3">
          <div>
            <NewBalanceFrom transaction={transaction} />
          </div>
          <div>
            <NewBalanceTo transaction={transaction} />
          </div>
        </div>
        {!sameUnit && <ImpliedRate />}
      </div>

      <Description fieldName="transfer.description" />
      <Tags fieldName="transfer.tagNames" />
      <Category fieldName="transfer.categoryId" />

      {/* When editing transactions, do not update the category automatically:
      the user might not notice the change and unintentionally recategorise the
      transaction when they only mean to change the description. */}
      {isCreatingNewTransaction && <UpdateCategoryOnDescriptionChange />}
      <UpdateReceivedAmountOnAmountChange />
    </>
  );
}

function NewBalanceFrom({transaction}: {transaction: Transaction | null}) {
  const amount = useWatch({name: 'transfer.amountSent', exact: true});
  const accountId = useWatch({name: 'transfer.fromAccountId', exact: true});
  return (
    <NewBalanceNote
      amount={-amount}
      accountId={accountId}
      transaction={transaction}
    />
  );
}

function NewBalanceTo({transaction}: {transaction: Transaction | null}) {
  const amount = useWatch({name: 'transfer.amountReceived', exact: true});
  const accountId = useWatch({name: 'transfer.toAccountId', exact: true});
  return (
    <NewBalanceNote
      amount={amount}
      accountId={accountId}
      transaction={transaction}
    />
  );
}

function ImpliedRate() {
  const sent = Number(useWatch({name: 'transfer.amountSent', exact: true}));
  const received = Number(
    useWatch({name: 'transfer.amountReceived', exact: true})
  );
  if (!(sent > 0) || !(received > 0)) {
    return null;
  }
  return (
    <div className="text-muted-foreground text-xs italic">
      Implied rate{' '}
      <span className="font-mono tabular-nums">
        {(received / sent).toFixed(4)}
      </span>
    </div>
  );
}
