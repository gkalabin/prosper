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
import {Category} from '@/components/txform/shared/Category';
import {Companion} from '@/components/txform/shared/Companion';
import {NewBalanceNote} from '@/components/txform/shared/NewBalanceNote';
import {Tags} from '@/components/txform/shared/Tags';
import {Timestamp} from '@/components/txform/shared/Timestamp';
import {UpdateCategoryOnVendorChange} from '@/components/txform/shared/UpdateCategoryOnChange';
import {UpdateOwnShareOnAmountChange as CommonUpdateOwnShareOnAmountChange} from '@/components/txform/shared/UpdateOwnShareOnAmountChange';
import {TransactionFormSchema} from '@/components/txform/types';
import {assertDefined} from '@/lib/assert';
import {Transaction} from '@/lib/model/transaction/Transaction';
import {useFormContext, useWatch} from 'react-hook-form';

export function ExpenseForm({transaction}: {transaction: Transaction | null}) {
  const {getValues} = useFormContext<TransactionFormSchema>();
  assertDefined(getValues('expense'), 'expense form requires expense values');
  const isCreatingNewTransaction = !transaction;
  return (
    <>
      <Timestamp fieldName="expense.timestamp" />
      <AccountFrom />
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
      <Category fieldName="expense.categoryId" />
      <ExtraFields />
      {/* When editing transactions, do not update the category automatically:
      the user might not notice the change and unintentionally recategorise the
      transaction when they only mean to fix a typo in vendor. */}
      {isCreatingNewTransaction && <UpdateCategoryOnVendorChange />}
      <UpdateOwnShareOnAmountChange />
    </>
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
