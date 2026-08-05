import {useSharingType} from '@/components/txform/expense/useSharingType';
import {useAccountCurrency} from '@/components/txform/shared/useAccountCurrency';
import {Currency, findByCode} from '@/lib/model/Currency';
import {useWatch} from 'react-hook-form';

// useExpenseCurrency returns the currency the expense amount is denominated in.
// Returns null when the account holds a stock.
export function useExpenseCurrency(): Currency | null {
  const {paidSelf} = useSharingType();
  const accountId = useWatch({name: 'expense.accountId', exact: true});
  const accountCurrency = useAccountCurrency(accountId);
  const currency = useWatch({name: 'expense.currency', exact: true});
  if (paidSelf) {
    return accountCurrency;
  }
  return currency ? findByCode(currency) : null;
}
