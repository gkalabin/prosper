import {Amount} from '@/components/txform/v2/income/inputs/Amount';
import {Category} from '@/components/txform/v2/income/inputs/Category';
import {ExtraFields} from '@/components/txform/v2/income/inputs/ExtraFields';
import {OwnShareAmount} from '@/components/txform/v2/income/inputs/OwnShareAmount';
import {Payer} from '@/components/txform/v2/income/inputs/Payer';
import {SplitTransactionToggle} from '@/components/txform/v2/income/inputs/SplitTransactionToggle';
import {UpdateCategoryOnPayerChange} from '@/components/txform/v2/income/inputs/UpdateCategoryOnPayerChange';
import {Account} from '@/components/txform/v2/shared/Account';
import {Companion} from '@/components/txform/v2/shared/Companion';
import {Tags} from '@/components/txform/v2/shared/Tags';
import {Timestamp} from '@/components/txform/v2/shared/Timestamp';
import {UpdateOwnShareOnAmountChange as CommonUpdateOwnShareOnAmountChange} from '@/components/txform/v2/shared/UpdateOwnShareOnAmountChange';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {useFormContext} from 'react-hook-form';

export function IncomeForm() {
  return (
    <>
      <Timestamp fieldName="income.timestamp" />
      <Account fieldName="income.accountId" label="Money received to" />
      <SplitTransactionToggle />
      <MaybeEmptyCompanion />
      <Amount />
      <OwnShareAmount />
      <Payer />
      <Tags fieldName="income.tagNames" />
      <Category />
      <ExtraFields />

      <UpdateCategoryOnPayerChange />
      <UpdateOwnShareOnAmountChange />
    </>
  );
}

function MaybeEmptyCompanion() {
  const {watch} = useFormContext<TransactionFormSchema>();
  const isShared = watch('income.isShared');
  if (!isShared) {
    return null;
  }
  return <Companion fieldName="expense.companion" />;
}

function UpdateOwnShareOnAmountChange() {
  const {watch} = useFormContext<TransactionFormSchema>();
  return (
    <CommonUpdateOwnShareOnAmountChange
      isShared={watch('income.isShared')}
      amountFieldName="income.amount"
      ownShareFieldName="income.ownShareAmount"
    />
  );
}
