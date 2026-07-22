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

// A transfer moves money between the user's own accounts. It reads as two
// paired decisions kept side by side: where the money moves (from/to) and how
// much at what rate (sent/received when the currencies differ).
export function TransferForm({transaction}: {transaction: Transaction | null}) {
  const {getValues} = useFormContext<TransactionFormSchema>();
  assertDefined(
    getValues('transfer'),
    'transfer form requires transfer values'
  );
  const isCreatingNewTransaction = !transaction;
  const sameUnit = useAccountUnitsEqual();
  return (
    <div className="flex flex-col gap-4">
      <Timestamp fieldName="transfer.timestamp" />

      <div className="space-y-2">
        <div className="text-foreground text-sm font-medium">Move money</div>
        <div className="grid grid-cols-2 gap-3">
          <Account fieldName="transfer.fromAccountId" label="From" />
          <Account fieldName="transfer.toAccountId" label="To" />
        </div>
      </div>

      {sameUnit ? (
        <div className="space-y-2">
          <Amount />
          <NewBalanceFrom transaction={transaction} />
          <NewBalanceTo transaction={transaction} />
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Amount />
              <NewBalanceFrom transaction={transaction} />
            </div>
            <div className="space-y-1.5">
              <AmountReceived />
              <NewBalanceTo transaction={transaction} />
            </div>
          </div>
          <ImpliedRate />
        </div>
      )}

      <Description fieldName="transfer.description" />
      <Tags fieldName="transfer.tagNames" />
      <Category fieldName="transfer.categoryId" />

      {/* When editing transactions, do not update the category automatically:
      the user might not notice the change and unintentionally recategorise the
      transaction when they only mean to change the description. */}
      {isCreatingNewTransaction && <UpdateCategoryOnDescriptionChange />}
      <UpdateReceivedAmountOnAmountChange />
    </div>
  );
}

function NewBalanceFrom({transaction}: {transaction: Transaction | null}) {
  const amount = useWatch({name: 'transfer.amountSent', exact: true});
  const accountId = useWatch({name: 'transfer.fromAccountId', exact: true});
  return (
    <NewBalanceNote
      text="From →"
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
      text="To →"
      amount={amount}
      accountId={accountId}
      transaction={transaction}
    />
  );
}

// ImpliedRate surfaces the exchange rate the sent/received amounts imply, so an
// FX transfer states what rate it assumes.
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
