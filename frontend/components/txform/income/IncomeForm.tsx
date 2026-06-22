import {Amount} from '@/components/txform/income/Amount';
import {ExtraFields} from '@/components/txform/income/ExtraFields';
import {OwnShareAmount} from '@/components/txform/income/OwnShareAmount';
import {Payer} from '@/components/txform/income/Payer';
import {SplitTransactionToggle} from '@/components/txform/income/SplitTransactionToggle';
import {Account} from '@/components/txform/shared/Account';
import {Category} from '@/components/txform/shared/Category';
import {Companion} from '@/components/txform/shared/Companion';
import {NewBalanceNote} from '@/components/txform/shared/NewBalanceNote';
import {Tags} from '@/components/txform/shared/Tags';
import {Timestamp} from '@/components/txform/shared/Timestamp';
import {UpdateOwnShareOnAmountChange as CommonUpdateOwnShareOnAmountChange} from '@/components/txform/shared/UpdateOwnShareOnAmountChange';
import {SubFormValues, TransactionFormSchema} from '@/components/txform/types';
import {assertDefined} from '@/lib/assert';
import {Transaction} from '@/lib/model/transaction/Transaction';
import {useFormContext, useWatch} from 'react-hook-form';

export function IncomeForm({transaction}: {transaction: Transaction | null}) {
  const {getValues} = useFormContext<TransactionFormSchema>();
  assertDefined(getValues('income'), 'income form requires income values');
  return (
    <>
      <Timestamp fieldName="income.timestamp" />
      <Account fieldName="income.accountId" label="Money received to" />
      <SplitTransactionToggle />
      <MaybeEmptyCompanion />
      <Amount />
      <OwnShareAmount />
      <NewBalanceNoteWrapper transaction={transaction} />
      <Payer />
      <Tags fieldName="income.tagNames" />
      <Category fieldName="income.categoryId" />
      <ExtraFields />
      <UpdateOwnShareOnAmountChange />
    </>
  );
}

function MaybeEmptyCompanion() {
  const {watch} = useFormContext<SubFormValues>();
  const isShared = watch('income.isShared');
  if (!isShared) {
    return null;
  }
  return <Companion fieldName="income.companion" />;
}

function UpdateOwnShareOnAmountChange() {
  const {watch} = useFormContext<SubFormValues>();
  return (
    <CommonUpdateOwnShareOnAmountChange
      isShared={watch('income.isShared')}
      amountFieldName="income.amount"
      ownShareFieldName="income.ownShareAmount"
    />
  );
}

function NewBalanceNoteWrapper({
  transaction,
}: {
  transaction: Transaction | null;
}) {
  const amount = useWatch({name: 'income.amount', exact: true});
  const accountId = useWatch({name: 'income.accountId', exact: true});
  return (
    <div className="col-span-6">
      <NewBalanceNote
        amount={amount}
        accountId={accountId}
        transaction={transaction}
      />
    </div>
  );
}
