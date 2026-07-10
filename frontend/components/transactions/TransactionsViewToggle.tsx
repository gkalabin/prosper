import {cn} from '@/lib/utils';
import {ChartPieIcon, ListBulletIcon} from '@heroicons/react/24/outline';

export type TransactionsView = 'list' | 'stats';

const OPTIONS: {
  value: TransactionsView;
  label: string;
  Icon: typeof ListBulletIcon;
}[] = [
  {value: 'list', label: 'List', Icon: ListBulletIcon},
  {value: 'stats', label: 'Stats', Icon: ChartPieIcon},
];

export function TransactionsViewToggle({
  view,
  onChange,
}: {
  view: TransactionsView;
  onChange: (view: TransactionsView) => void;
}) {
  return (
    <div className="border-border bg-secondary relative flex rounded-xl border p-1 shadow-inner">
      <div
        className="bg-primary absolute inset-y-1 left-1 w-20 rounded-lg shadow transition-transform duration-300 ease-out"
        style={{
          transform: view === 'stats' ? 'translateX(100%)' : 'translateX(0)',
        }}
      />
      {OPTIONS.map(({value, label, Icon}) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={cn(
            'relative z-10 flex w-20 items-center justify-center gap-1.5 rounded-lg py-1.5 text-sm font-medium transition-colors',
            view === value ? 'text-primary-foreground' : 'text-muted-foreground'
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  );
}
