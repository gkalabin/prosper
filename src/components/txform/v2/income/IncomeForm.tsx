import {Amount} from '@/components/txform/v2/income/Amount';
import {ExtraFields} from '@/components/txform/v2/income/ExtraFields';
import {OwnShareAmount} from '@/components/txform/v2/income/OwnShareAmount';
import {Payer} from '@/components/txform/v2/income/Payer';
import {SplitTransactionToggle} from '@/components/txform/v2/income/SplitTransactionToggle';
import {Account} from '@/components/txform/v2/shared/Account';
import {Companion} from '@/components/txform/v2/shared/Companion';
import {Tags} from '@/components/txform/v2/shared/Tags';
import {Category as CategoryCommon} from '@/components/txform/v2/shared/Category';
import {Timestamp} from '@/components/txform/v2/shared/Timestamp';
import {UpdateOwnShareOnAmountChange as CommonUpdateOwnShareOnAmountChange} from '@/components/txform/v2/shared/UpdateOwnShareOnAmountChange';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {useFormContext, useWatch} from 'react-hook-form';
import {
  isRecent,
  matchesPayer,
} from '@/components/txform/v2/shared/useTopCategoryIds';
import {isIncome} from '@/lib/model/transaction/Transaction';
import {UpdateCategoryOnChange} from '@/components/txform/v2/shared/UpdateCategoryOnChange';

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

function UpdateCategoryOnPayerChange() {
  const payer = useWatch({name: 'income.payer', exact: true});
  return (
    <UpdateCategoryOnChange
      fieldName="income.categoryId"
      filters={[isIncome, matchesPayer(payer)]}
    />
  );
}

function Category() {
  const payer = useWatch({name: 'income.payer', exact: true});
  return (
    <CategoryCommon
      fieldName="income.categoryId"
      filters={[isIncome, matchesPayer(payer), isRecent]}
    />
  );
}

function MaybeEmptyCompanion() {
  const {watch} = useFormContext<TransactionFormSchema>();
  const isShared = watch('income.isShared');
  if (!isShared) {
    return null;
  }
  return <Companion fieldName="income.companion" />;
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
