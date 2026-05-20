'use client';
import {Button} from '@/components/ui/button';
import {Spoiler} from '@/components/Spoiler';
import {
  HIDE_BALANCES_COOKIE_MAX_AGE,
  HIDE_BALANCES_COOKIE_NAME,
} from '@/lib/const';
import {EyeIcon, EyeSlashIcon} from '@heroicons/react/24/outline';
import {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useState,
} from 'react';

type ContextData = {
  hideBalances: boolean;
  setHideBalances: Dispatch<SetStateAction<boolean>>;
};

const HideBalancesContext = createContext<ContextData>(
  null as unknown as ContextData
);

export function HideBalancesContextProvider(props: {
  initialHideBalances: boolean;
  children: JSX.Element | JSX.Element[];
}) {
  const [hideBalances, setHideBalances] = useState(props.initialHideBalances);
  const updateStateAndSetCookie = (newValue: SetStateAction<boolean>) => {
    setHideBalances(newValue);
    document.cookie = `${HIDE_BALANCES_COOKIE_NAME}=${newValue}; path=/; max-age=${HIDE_BALANCES_COOKIE_MAX_AGE}`;
  };
  return (
    <HideBalancesContext.Provider
      value={{hideBalances, setHideBalances: updateStateAndSetCookie}}
    >
      {props.children}
    </HideBalancesContext.Provider>
  );
}

function useHideBalancesContext() {
  const ctx = useContext(HideBalancesContext);
  if (!ctx) {
    throw new Error('HideBalancesContext is not configured');
  }
  return ctx;
}

function useHideBalances() {
  return useHideBalancesContext().hideBalances;
}

export function ToggleHideBalancesButton() {
  const {hideBalances, setHideBalances} = useHideBalancesContext();
  return (
    <Button onClick={() => setHideBalances(!hideBalances)}>
      {!hideBalances && (
        <>
          <EyeSlashIcon className="mr-2 h-4 w-4" />
          Hide balances
        </>
      )}
      {hideBalances && (
        <>
          <EyeIcon className="mr-2 h-4 w-4" />
          Show balances
        </>
      )}
    </Button>
  );
}

export function MaybeHiddenDiv({
  className,
  children,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const hidden = useHideBalances();
  const sensitiveContent = <div className={className}>{children}</div>;
  if (!hidden) {
    return sensitiveContent;
  }
  return <Spoiler>{sensitiveContent}</Spoiler>;
}
