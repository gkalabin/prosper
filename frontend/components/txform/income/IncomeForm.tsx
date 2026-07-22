import {Amount} from '@/components/txform/income/Amount';
import {ExtraFields} from '@/components/txform/income/ExtraFields';
import {IncomeSplitBlock} from '@/components/txform/income/SplitBlock';
import {IncomeSplitControl} from '@/components/txform/income/SplitControl';
import {Payer} from '@/components/txform/income/Payer';
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
  const {getValues} = useFormContext<TransactionFormSchema>();
  assertDefined(getValues('income'), 'income form requires income values');
  const isCreatingNewTransaction = !transaction;
  return (
    <div className="flex flex-col gap-4">
      <Timestamp fieldName="income.timestamp" />
      <div className="space-y-2">
        <Amount />
        <IncomeNewBalanceNote transaction={transaction} />
      </div>
      <Account fieldName="income.accountId" label="Money received to" />
      <Payer />
      <IncomeSplitControl />
      <IncomeSplitBlock />
      <Tags fieldName="income.tagNames" />
      <Category fieldName="income.categoryId" />
      <ExtraFields />
      {/* When editing transactions, do not update the category automatically:
      the user might not notice the change and unintentionally recategorise the
      transaction when they only mean to fix a typo in payer. */}
      {isCreatingNewTransaction && <UpdateCategoryOnPayerChange />}
      <UpdateOwnShareOnAmountChange />
    </div>
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

function IncomeNewBalanceNote({
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
