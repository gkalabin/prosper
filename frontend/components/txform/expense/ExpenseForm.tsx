import {AccountFrom} from '@/components/txform/expense/AccountFrom';
import {Amount} from '@/components/txform/expense/Amount';
import {ExtraFields} from '@/components/txform/expense/ExtraFields';
import {PaidOtherBlock} from '@/components/txform/expense/PaidOtherBlock';
import {SharingControls} from '@/components/txform/expense/SharingControls';
import {SplitBlock} from '@/components/txform/expense/SplitBlock';
import {useSharingType} from '@/components/txform/expense/useSharingType';
import {Vendor} from '@/components/txform/expense/Vendor';
import {Category} from '@/components/txform/shared/Category';
import {NewBalanceNote} from '@/components/txform/shared/NewBalanceNote';
import {Tags} from '@/components/txform/shared/Tags';
import {Timestamp} from '@/components/txform/shared/Timestamp';
import {UpdateCategoryOnVendorChange} from '@/components/txform/shared/UpdateCategoryOnChange';
import {UpdateOwnShareOnAmountChange as CommonUpdateOwnShareOnAmountChange} from '@/components/txform/shared/UpdateOwnShareOnAmountChange';
import {TransactionFormSchema} from '@/components/txform/types';
import {assertDefined} from '@/lib/assert';
import {Transaction} from '@/lib/model/transaction/Transaction';
import {useFormContext, useWatch} from 'react-hook-form';

// The expense form tells the story of a purchase top to bottom: when it
// happened, how much, who paid and out of which pocket (sharing is a quiet
// modifier revealed on demand), where the money went, then how it's filed.
export function ExpenseForm({transaction}: {transaction: Transaction | null}) {
  const {getValues} = useFormContext<TransactionFormSchema>();
  assertDefined(getValues('expense'), 'expense form requires expense values');
  const isCreatingNewTransaction = !transaction;
  return (
    <div className="flex flex-col gap-4">
      <Timestamp fieldName="expense.timestamp" />
      <div className="space-y-2">
        <Amount />
        <PaidSelfNewBalanceNote transaction={transaction} />
      </div>
      <AccountFrom />
      <SharingControls />
      <SplitBlock />
      <PaidOtherBlock transaction={transaction} />
      <Vendor />
      <Tags fieldName="expense.tagNames" />
      <Category fieldName="expense.categoryId" />
      <ExtraFields />
      {/* When editing transactions, do not update the category automatically:
      the user might not notice the change and unintentionally recategorise the
      transaction when they only mean to fix a typo in vendor. */}
      {isCreatingNewTransaction && <UpdateCategoryOnVendorChange />}
      <UpdateOwnShareOnAmountChange />
    </div>
  );
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
    <NewBalanceNote
      transaction={transaction}
      amount={-amount}
      accountId={accountId}
    />
  );
}
