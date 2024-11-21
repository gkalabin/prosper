import {
  HIDE_BALANCES_COOKIE_MAX_AGE,
  HIDE_BALANCES_COOKIE_NAME,
} from '@/lib/const';
import {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useState,
} from 'react';

export const HideBalancesContext = createContext(false);

export function useHideBalancesContext() {
  return useContext(HideBalancesContext);
}

export function useHideBalancesFlag(
  initialValue: boolean
): [boolean, Dispatch<SetStateAction<boolean>>] {
  const [_hideBalances, _setHideBalances] = useState(initialValue);
  const setHideBalances = (newValue: SetStateAction<boolean>) => {
    _setHideBalances(newValue);
    document.cookie = `${HIDE_BALANCES_COOKIE_NAME}=${newValue}; path=/; max-age=${HIDE_BALANCES_COOKIE_MAX_AGE}`;
  };
  return [_hideBalances, setHideBalances];
}
