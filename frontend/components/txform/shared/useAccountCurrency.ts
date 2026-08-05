import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {Currency, findByCode} from '@/lib/model/Currency';

// useAccountCurrency returns the currency the given account is denominated in.
// Returns null when the account holds a stock or when there is no account id provided.
export function useAccountCurrency(accountId: number | null): Currency | null {
  const {bankAccounts} = useCoreDataContext();
  const code = bankAccounts.find(a => a.id === accountId)?.currencyCode;
  return code ? findByCode(code) : null;
}
