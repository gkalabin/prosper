import {AccountFrom} from '@/components/txform/v2/expense/inputs/AccountFrom';
import {Amount} from '@/components/txform/v2/expense/inputs/Amount';
import {Currency} from '@/components/txform/v2/expense/inputs/Currency';
import {ExtraFields} from '@/components/txform/v2/expense/inputs/ExtraFields';
import {OwnShareAmount} from '@/components/txform/v2/expense/inputs/OwnShareAmount';
import {Payer} from '@/components/txform/v2/expense/inputs/Payer';
import {RepaymentFields} from '@/components/txform/v2/expense/inputs/RepaymentFields';
import {SplitTransactionToggle} from '@/components/txform/v2/expense/inputs/SplitTransactionToggle';
import {Vendor} from '@/components/txform/v2/expense/inputs/Vendor';
import {useSharingType} from '@/components/txform/v2/expense/useSharingType';
import {Category as CategoryCommon} from '@/components/txform/v2/shared/Category';
import {Companion} from '@/components/txform/v2/shared/Companion';
import {Tags} from '@/components/txform/v2/shared/Tags';
import {Timestamp} from '@/components/txform/v2/shared/Timestamp';
import {UpdateCategoryOnChange} from '@/components/txform/v2/shared/UpdateCategoryOnChange';
import {UpdateOwnShareOnAmountChange as CommonUpdateOwnShareOnAmountChange} from '@/components/txform/v2/shared/UpdateOwnShareOnAmountChange';
import {
  isRecent,
  matchesVendor,
} from '@/components/txform/v2/shared/useTopCategoryIds';
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
