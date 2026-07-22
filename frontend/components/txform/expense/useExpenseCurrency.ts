import {useSharingType} from '@/components/txform/expense/useSharingType';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {useWatch} from 'react-hook-form';

// useExpenseCurrencyCode returns the currency the expense amount is denominated
// in: the paying account's currency when I paid, or the explicitly chosen
// currency when someone else paid (no account of mine is involved).
export function useExpenseCurrencyCode(): string | undefined {
  const {paidSelf} = useSharingType();
  const {bankAccounts} = useCoreDataContext();
  const accountId = useWatch({name: 'expense.accountId', exact: true});
  const currency = useWatch({name: 'expense.currency', exact: true});
  if (paidSelf) {
    return (
      bankAccounts.find(a => a.id === accountId)?.currencyCode ?? undefined
    );
  }
  return currency ?? undefined;
}
