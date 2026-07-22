import {useSharingType} from '@/components/txform/expense/useSharingType';
import {Account} from '@/components/txform/shared/Account';

// AccountFrom is the account an expense was paid from. It is shown only when I
// paid; when someone else paid there is no account of mine to debit.
export function AccountFrom() {
  const {paidSelf} = useSharingType();
  if (!paidSelf) {
    return null;
  }
  return <Account fieldName="expense.accountId" label="Paid from" />;
}
