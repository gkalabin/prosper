import {AccountFrom} from '@/components/txform/expense/AccountFrom';
import {Amount} from '@/components/txform/expense/Amount';
import {Currency} from '@/components/txform/expense/Currency';
import {ExtraFields} from '@/components/txform/expense/ExtraFields';
import {OwnShareAmount} from '@/components/txform/expense/OwnShareAmount';
import {Payer} from '@/components/txform/expense/Payer';
import {RepaymentFields} from '@/components/txform/expense/RepaymentFields';
import {SplitTransactionToggle} from '@/components/txform/expense/SplitTransactionToggle';
import {Vendor} from '@/components/txform/expense/Vendor';
import {useSharingType} from '@/components/txform/expense/useSharingType';
import {Category as CategoryCommon} from '@/components/txform/shared/Category';
import {Companion} from '@/components/txform/shared/Companion';
import {Tags} from '@/components/txform/shared/Tags';
import {Timestamp} from '@/components/txform/shared/Timestamp';
import {UpdateCategoryOnChange} from '@/components/txform/shared/UpdateCategoryOnChange';
import {UpdateOwnShareOnAmountChange as CommonUpdateOwnShareOnAmountChange} from '@/components/txform/shared/UpdateOwnShareOnAmountChange';
import {
  isRecent,
  matchesVendor,
} from '@/components/txform/shared/useTopCategoryIds';
import {isExpense} from '@/lib/model/transaction/Transaction';
import {TransactionPrototype} from '@/lib/txsuggestions/TransactionPrototype';
import {useWatch} from 'react-hook-form';

export function ExpenseForm({proto}: {proto: TransactionPrototype | null}) {
  return (
    <>
      <Timestamp fieldName="expense.timestamp" />
      <AccountFrom proto={proto} />
      <Payer />
      <SplitTransactionToggle />
      <MaybeEmptyCompanion />
      <Currency />
      <Amount />
      <OwnShareAmount />
      <RepaymentFields />
      <Vendor />
      <Tags fieldName="expense.tagNames" />
      <Category />
      <ExtraFields />

      <UpdateCategoryOnVendorChange />
      <UpdateOwnShareOnAmountChange />
    </>
  );
}

function UpdateCategoryOnVendorChange() {
  const vendor = useWatch({name: 'expense.vendor', exact: true});
  return (
    <UpdateCategoryOnChange
      fieldName="expense.categoryId"
      filters={[isExpense, matchesVendor(vendor)]}
    />
  );
}

function Category() {
  const vendor = useWatch({name: 'expense.vendor', exact: true});
  return (
    <CategoryCommon
      fieldName="expense.categoryId"
      filters={[isExpense, matchesVendor(vendor), isRecent]}
    />
  );
}

function MaybeEmptyCompanion() {
  const {isShared, paidSelf} = useSharingType();
  if (!isShared || !paidSelf) {
    return null;
  }
  return <Companion fieldName="expense.companion" />;
}

function UpdateOwnShareOnAmountChange() {
  return (
    <CommonUpdateOwnShareOnAmountChange
      isShared={useSharingType().isShared}
      amountFieldName="expense.amount"
      ownShareFieldName="expense.ownShareAmount"
    />
  );
}
