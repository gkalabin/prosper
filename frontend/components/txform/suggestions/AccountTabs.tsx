import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {accountBank, BankAccount} from '@/lib/model/BankAccount';
import {cn} from '@/lib/utils';

export function AccountTabs({
  accounts,
  activeAccountId,
  setActiveAccountId,
  pendingCountByAccount,
  disabled,
}: {
  accounts: BankAccount[];
  activeAccountId: number;
  setActiveAccountId: (accountId: number) => void;
  pendingCountByAccount: Map<number, number>;
  disabled: boolean;
}) {
  const {banks} = useCoreDataContext();
  return (
    <div
      role="tablist"
      aria-label="Accounts with suggestions"
      className="flex flex-wrap gap-1.5"
    >
      {accounts.map(account => {
        const active = account.id === activeAccountId;
        const pending = pendingCountByAccount.get(account.id) ?? 0;
        return (
          <button
            key={account.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setActiveAccountId(account.id)}
            disabled={disabled}
            className={cn(
              'flex-none rounded-xl border px-3 py-2 text-left transition-colors disabled:opacity-50',
              active
                ? 'bg-primary text-primary-foreground border-transparent'
                : 'bg-card border-input text-foreground'
            )}
          >
            <span className="block text-xs font-bold uppercase leading-none tracking-wide opacity-70">
              {accountBank(account, banks).name}
            </span>
            <span className="mt-1 block whitespace-nowrap text-sm font-semibold leading-none">
              {account.name}
              {pending > 0 && (
                <span className="font-medium opacity-60"> · {pending}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
