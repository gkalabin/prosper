import {Amount} from '@/components/txform/expense/Amount';
import {ExtraFields} from '@/components/txform/expense/ExtraFields';
import {PaidOtherBlock} from '@/components/txform/expense/PaidOtherBlock';
import {SharingControls} from '@/components/txform/expense/SharingControls';
import {SplitBlock} from '@/components/txform/expense/SplitBlock';
import {useSharingType} from '@/components/txform/expense/useSharingType';
import {Vendor} from '@/components/txform/expense/Vendor';
import {Account} from '@/components/txform/shared/Account';
import {Category} from '@/components/txform/shared/Category';
import {NewBalanceNote} from '@/components/txform/shared/NewBalanceNote';
import {Tags} from '@/components/txform/shared/Tags';
import {Timestamp} from '@/components/txform/shared/Timestamp';
import {UpdateCategoryOnVendorChange} from '@/components/txform/shared/UpdateCategoryOnChange';
import {UpdateOwnShareOnAmountChange as CommonUpdateOwnShareOnAmountChange} from '@/components/txform/shared/UpdateOwnShareOnAmountChange';
import {TransactionFormSchema} from '@/components/txform/types';
import {assertDefined} from '@/lib/assert';
import {SharingType} from '@/lib/grpc/gen/prosper/v1/ledger';
import {Transaction} from '@/lib/model/transaction/Transaction';
import {useFormContext, useWatch} from 'react-hook-form';

export function ExpenseForm({transaction}: {transaction: Transaction | null}) {
  const {getValues} = useFormContext<TransactionFormSchema>();
  assertDefined(getValues('expense'), 'expense form requires expense values');
  const {sharingType, paidSelf, paidOther} = useSharingType();
  const isCreatingNewTransaction = !transaction;
  return (
    <>
      <Timestamp fieldName="expense.timestamp" label="When" />
      <div className="space-y-2">
        <Amount />
        {paidSelf && <PaidSelfNewBalanceNote transaction={transaction} />}
      </div>
      {paidSelf && <Account fieldName="expense.accountId" label="Paid from" />}
      {sharingType == SharingType.PAID_SELF_NOT_SHARED && <SharingControls />}
      {sharingType == SharingType.PAID_SELF_SHARED && <SplitBlock />}
      {paidOther && <PaidOtherBlock transaction={transaction} />}
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
  const amount = useWatch({name: 'expense.amount', exact: true});
  const accountId = useWatch({name: 'expense.accountId', exact: true});
  return (
    <NewBalanceNote
      transaction={transaction}
      amount={-amount}
      accountId={accountId}
    />
  );
}
