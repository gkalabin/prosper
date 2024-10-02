import {AccountFrom} from '@/components/txform/v2/expense/inputs/AccountFrom';
import {Amount} from '@/components/txform/v2/expense/inputs/Amount';
import {Category} from '@/components/txform/v2/expense/inputs/Category';
import {Currency} from '@/components/txform/v2/expense/inputs/Currency';
import {ExtraFields} from '@/components/txform/v2/expense/inputs/ExtraFields';
import {OwnShareAmount} from '@/components/txform/v2/expense/inputs/OwnShareAmount';
import {Payer} from '@/components/txform/v2/expense/inputs/Payer';
import {RepaymentFields} from '@/components/txform/v2/expense/inputs/RepaymentFields';
import {SplitTransactionToggle} from '@/components/txform/v2/expense/inputs/SplitTransactionToggle';
import {Vendor} from '@/components/txform/v2/expense/inputs/Vendor';
import {useSharingType} from '@/components/txform/v2/expense/useSharingType';
import {Companion} from '@/components/txform/v2/shared/Companion';
import {Tags} from '@/components/txform/v2/shared/Tags';
import {Timestamp} from '@/components/txform/v2/shared/Timestamp';
import {TransactionPrototype} from '@/lib/txsuggestions/TransactionPrototype';

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
