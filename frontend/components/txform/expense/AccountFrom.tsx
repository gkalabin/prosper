import {useSharingType} from '@/components/txform/expense/useSharingType';
import {Account} from '@/components/txform/shared/Account';

export function AccountFrom() {
  const {paidSelf} = useSharingType();
  if (!paidSelf) {
    return null;
  }
  return <Account fieldName="expense.accountId" label="I paid from" />;
}
