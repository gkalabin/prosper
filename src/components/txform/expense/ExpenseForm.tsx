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
import {NewBalanceNote} from '@/components/txform/shared/NewBalanceNote';
import {Tags} from '@/components/txform/shared/Tags';
import {Timestamp} from '@/components/txform/shared/Timestamp';
import {UpdateCategoryOnChange} from '@/components/txform/shared/UpdateCategoryOnChange';
import {UpdateOwnShareOnAmountChange as CommonUpdateOwnShareOnAmountChange} from '@/components/txform/shared/UpdateOwnShareOnAmountChange';
import {
  isRecent,
  matchesVendor,
} from '@/components/txform/shared/useTopCategoryIds';
import {isExpense, Transaction} from '@/lib/model/transaction/Transaction';
import {TransactionPrototype} from '@/lib/txsuggestions/TransactionPrototype';
import {useMemo} from 'react';
import {useWatch} from 'react-hook-form';

export function ExpenseForm({
  proto,
  transaction,
}: {
  proto: TransactionPrototype | null;
  transaction: Transaction | null;
}) {
  const isCreatingNewTransaction = !transaction;
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
      <PaidSelfNewBalanceNote transaction={transaction} />
      <RepaymentFields />
      <Vendor />
      <Tags fieldName="expense.tagNames" />
      <Category />
      <ExtraFields />

      {/* When editing transactions, do not update category automatically.
      The user might not notice the automatic updates and then unintentionally
      change the category when they only mean to change the vendor. */}
      {isCreatingNewTransaction && <UpdateCategoryOnVendorChange />}
      <UpdateOwnShareOnAmountChange />
    </>
  );
}

function UpdateCategoryOnVendorChange() {
  const vendor = useWatch({name: 'expense.vendor', exact: true});
  const filters = useMemo(() => [isExpense, matchesVendor(vendor)], [vendor]);
  return (
    <UpdateCategoryOnChange fieldName="expense.categoryId" filters={filters} />
  );
}

function Category() {
  const vendor = useWatch({name: 'expense.vendor', exact: true});
  const filters = useMemo(
    () => [isExpense, matchesVendor(vendor), isRecent],
    [vendor]
  );
  return <CategoryCommon fieldName="expense.categoryId" filters={filters} />;
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

function PaidSelfNewBalanceNote({
  transaction,
}: {
  transaction: Transaction | null;
}) {
  const {paidSelf} = useSharingType();
  const amount = useWatch({name: 'expense.amount', exact: true});
  const accountId = useWatch({name: 'expense.accountId', exact: true});
  if (!paidSelf) {
    return null;
  }
  return (
    <div className="col-span-6">
      <NewBalanceNote
        transaction={transaction}
        amount={-amount}
        accountId={accountId}
      />
    </div>
  );
}
