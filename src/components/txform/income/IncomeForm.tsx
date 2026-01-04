import {Amount} from '@/components/txform/income/Amount';
import {ExtraFields} from '@/components/txform/income/ExtraFields';
import {OwnShareAmount} from '@/components/txform/income/OwnShareAmount';
import {Payer} from '@/components/txform/income/Payer';
import {SplitTransactionToggle} from '@/components/txform/income/SplitTransactionToggle';
import {Account} from '@/components/txform/shared/Account';
import {Category as CategoryCommon} from '@/components/txform/shared/Category';
import {Companion} from '@/components/txform/shared/Companion';
import {NewBalanceNote} from '@/components/txform/shared/NewBalanceNote';
import {Tags} from '@/components/txform/shared/Tags';
import {Timestamp} from '@/components/txform/shared/Timestamp';
import {UpdateCategoryOnChange} from '@/components/txform/shared/UpdateCategoryOnChange';
import {UpdateOwnShareOnAmountChange as CommonUpdateOwnShareOnAmountChange} from '@/components/txform/shared/UpdateOwnShareOnAmountChange';
import {
  isRecent,
  matchesPayer,
} from '@/components/txform/shared/useTopCategoryIds';
import {TransactionFormSchema} from '@/components/txform/types';
import {isIncome, Transaction} from '@/lib/model/transaction/Transaction';
import {useMemo} from 'react';
import {useFormContext, useWatch} from 'react-hook-form';

export function IncomeForm({transaction}: {transaction: Transaction | null}) {
  const isCreatingNewTransaction = !transaction;
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
      <Category />
      <ExtraFields />

      {/* When editing transactions, do not update category automatically.
      The user might not notice the automatic updates and then unintentionally
      change the category when they only mean to change the payer. */}
      {isCreatingNewTransaction && <UpdateCategoryOnPayerChange />}
      <UpdateOwnShareOnAmountChange />
    </>
  );
}

function UpdateCategoryOnPayerChange() {
  const payer = useWatch({name: 'income.payer', exact: true});
  const filters = useMemo(() => [isIncome, matchesPayer(payer)], [payer]);
  return (
    <UpdateCategoryOnChange fieldName="income.categoryId" filters={filters} />
  );
}

function Category() {
  const payer = useWatch({name: 'income.payer', exact: true});
  const filters = useMemo(
    () => [isIncome, matchesPayer(payer), isRecent],
    [payer]
  );
  return <CategoryCommon fieldName="income.categoryId" filters={filters} />;
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
      isShared={watch('income.isShared') ?? false}
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
