import {Amount} from '@/components/txform/income/Amount';
import {ExtraFields} from '@/components/txform/income/ExtraFields';
import {Payer} from '@/components/txform/income/Payer';
import {SharingControls} from '@/components/txform/income/SharingControls';
import {SplitBlock} from '@/components/txform/income/SplitBlock';
import {Account} from '@/components/txform/shared/Account';
import {Category} from '@/components/txform/shared/Category';
import {NewBalanceNote} from '@/components/txform/shared/NewBalanceNote';
import {Tags} from '@/components/txform/shared/Tags';
import {Timestamp} from '@/components/txform/shared/Timestamp';
import {UpdateCategoryOnPayerChange} from '@/components/txform/shared/UpdateCategoryOnChange';
import {UpdateOwnShareOnAmountChange as CommonUpdateOwnShareOnAmountChange} from '@/components/txform/shared/UpdateOwnShareOnAmountChange';
import {SubFormValues, TransactionFormSchema} from '@/components/txform/types';
import {assertDefined} from '@/lib/assert';
import {Transaction} from '@/lib/model/transaction/Transaction';
import {useFormContext, useWatch} from 'react-hook-form';

export function IncomeForm({transaction}: {transaction: Transaction | null}) {
  const {getValues, watch} = useFormContext<TransactionFormSchema>();
  assertDefined(getValues('income'), 'income form requires income values');
  const isShared = watch('income.isShared');
  const isCreatingNewTransaction = !transaction;
  return (
    <>
      <Timestamp fieldName="income.timestamp" label="When" />
      <div className="space-y-2">
        <Amount />
        <NewBalanceNoteWrapper transaction={transaction} />
      </div>
      <Account fieldName="income.accountId" label="Money received to" />
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Payer />
        </div>
        {!isShared && <SharingControls />}
      </div>
      {isShared && <SplitBlock />}
      <Tags fieldName="income.tagNames" />
      <Category fieldName="income.categoryId" />
      <ExtraFields />
      {/* When editing transactions, do not update the category automatically:
      the user might not notice the change and unintentionally recategorise the
      transaction when they only mean to fix a typo in payer. */}
      {isCreatingNewTransaction && <UpdateCategoryOnPayerChange />}
      <UpdateOwnShareOnAmountChange />
    </>
  );
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
    <NewBalanceNote
      amount={amount}
      accountId={accountId}
      transaction={transaction}
    />
  );
}
