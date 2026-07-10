import {TransactionDetail} from '@/components/transactions/TransactionDetail';
import {AmountWithUnit} from '@/lib/AmountWithUnit';
import {
  useCategoryTree,
  useCoreDataContext,
} from '@/lib/context/CoreDataContext';
import {BankAccount, fullAccountName} from '@/lib/model/BankAccount';
import {getNameWithAncestors} from '@/lib/model/Category';
import {Stock} from '@/lib/model/Stock';
import {Income} from '@/lib/model/transaction/Income';
import {
  OpeningBalance,
  openingBalanceAmount,
} from '@/lib/model/transaction/OpeningBalance';
import {PersonalExpense} from '@/lib/model/transaction/PersonalExpense';
import {ThirdPartyExpense} from '@/lib/model/transaction/ThirdPartyExpense';
import {
  Expense,
  Transaction,
  otherPartyName,
  transactionBankAccount,
} from '@/lib/model/transaction/Transaction';
import {
  Transfer,
  amountReceived,
  amountSent,
  incomingBankAccount,
  outgoingBankAccount,
} from '@/lib/model/transaction/Transfer';
import {
  ownShareAmountIgnoreRefunds,
  paidTotal,
} from '@/lib/model/transaction/amounts';
import {splitAmount} from '@/lib/util/util';
import {cn} from '@/lib/utils';
import {
  ArrowsRightLeftIcon,
  BanknotesIcon,
  ChevronRightIcon,
  ScaleIcon,
  ShoppingBagIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import {useState} from 'react';

export function TransactionRow({
  transaction,
  perspective,
}: {
  transaction: Transaction;
  perspective?: BankAccount;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <li>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'flex w-full cursor-pointer items-center gap-3 p-3.5 text-left transition-colors',
          expanded ? 'bg-secondary' : 'hover:bg-secondary/60'
        )}
      >
        <Summary transaction={transaction} perspective={perspective} />
        <ChevronRightIcon
          className={cn(
            'text-muted-foreground -ml-1 h-4 w-4 flex-none transition-transform',
            expanded && 'rotate-90'
          )}
        />
      </button>
      {expanded && <TransactionDetail transaction={transaction} />}
    </li>
  );
}

function Summary({
  transaction,
  perspective,
}: {
  transaction: Transaction;
  perspective?: BankAccount;
}) {
  switch (transaction.kind) {
    case 'PersonalExpense':
      return <PersonalExpenseSummary t={transaction} />;
    case 'ThirdPartyExpense':
      return <ThirdPartyExpenseSummary t={transaction} />;
    case 'Income':
      return <IncomeSummary t={transaction} />;
    case 'Transfer':
      return <TransferSummary t={transaction} perspective={perspective} />;
    case 'OpeningBalance':
      return <OpeningBalanceSummary t={transaction} />;
  }
}

function PersonalExpenseSummary({t}: {t: PersonalExpense}) {
  const {bankAccounts, stocks} = useCoreDataContext();
  const categoryTree = useCategoryTree();
  const account = transactionBankAccount(t, bankAccounts);
  const splitWith = otherPartyName(t);
  return (
    <>
      <RowIcon
        Icon={ShoppingBagIcon}
        className="bg-secondary text-foreground"
      />
      <RowText
        title={
          <>
            {t.vendor}
            {splitWith && <SuffixNote>split with {splitWith}</SuffixNote>}
          </>
        }
        subtitle={`${getNameWithAncestors(t.categoryId, categoryTree)} · ${account.name}`}
      />
      <RowAmount
        sign="-"
        amount={paidTotal(t, bankAccounts, stocks)}
        note={ownShareLabel(t, bankAccounts, stocks)}
        className="text-foreground"
      />
    </>
  );
}

function ThirdPartyExpenseSummary({t}: {t: ThirdPartyExpense}) {
  const {bankAccounts, stocks} = useCoreDataContext();
  const categoryTree = useCategoryTree();
  return (
    <>
      <RowIcon
        Icon={UsersIcon}
        className="bg-secondary text-muted-foreground"
      />
      <RowText
        title={
          <>
            {t.vendor}
            <SuffixNote>paid by {t.payer}</SuffixNote>
          </>
        }
        subtitle={`${getNameWithAncestors(t.categoryId, categoryTree)} · third-party`}
      />
      <RowAmount
        sign=""
        amount={paidTotal(t, bankAccounts, stocks)}
        note={ownShareLabel(t, bankAccounts, stocks)}
        className="text-muted-foreground"
      />
    </>
  );
}

function IncomeSummary({t}: {t: Income}) {
  const {bankAccounts, stocks} = useCoreDataContext();
  const categoryTree = useCategoryTree();
  const account = transactionBankAccount(t, bankAccounts);
  const splitWith = otherPartyName(t);
  return (
    <>
      <RowIcon
        Icon={BanknotesIcon}
        className="bg-up-amount/15 text-up-amount"
      />
      <RowText
        title={
          <>
            {t.payer}
            {splitWith && <SuffixNote>split with {splitWith}</SuffixNote>}
          </>
        }
        subtitle={`${getNameWithAncestors(t.categoryId, categoryTree)} · ${account.name}`}
      />
      <RowAmount
        sign="+"
        amount={paidTotal(t, bankAccounts, stocks)}
        note={ownShareLabel(t, bankAccounts, stocks)}
        className="text-up-amount"
      />
    </>
  );
}

function TransferSummary({
  t,
  perspective,
}: {
  t: Transfer;
  perspective?: BankAccount;
}) {
  const {bankAccounts, stocks} = useCoreDataContext();
  const categoryTree = useCategoryTree();
  const from = outgoingBankAccount(t, bankAccounts);
  const to = incomingBankAccount(t, bankAccounts);
  let sign = '';
  let amount = amountSent(t, bankAccounts, stocks);
  if (perspective?.id == t.toAccountId) {
    sign = '+';
    amount = amountReceived(t, bankAccounts, stocks);
  } else if (perspective?.id == t.fromAccountId) {
    sign = '-';
  }
  return (
    <>
      <RowIcon
        Icon={ArrowsRightLeftIcon}
        className="bg-secondary text-muted-foreground"
      />
      <RowText
        title={`${from.name} → ${to.name}`}
        subtitle={`${getNameWithAncestors(t.categoryId, categoryTree)} · ${t.note || 'Transfer'}`}
      />
      <RowAmount sign={sign} amount={amount} className="text-foreground" />
    </>
  );
}

function OpeningBalanceSummary({t}: {t: OpeningBalance}) {
  const {banks, bankAccounts, stocks} = useCoreDataContext();
  const account = transactionBankAccount(t, bankAccounts);
  return (
    <>
      <RowIcon
        Icon={ScaleIcon}
        className="border-border text-muted-foreground border border-dashed"
      />
      <RowText
        title={
          <span className="text-muted-foreground italic">Opening balance</span>
        }
        subtitle={fullAccountName(account, banks)}
      />
      <RowAmount
        sign=""
        amount={openingBalanceAmount(t, bankAccounts, stocks)}
        className="text-muted-foreground"
      />
    </>
  );
}

function ownShareLabel(
  t: Expense | Income,
  bankAccounts: BankAccount[],
  stocks: Stock[]
): string | null {
  if (!otherPartyName(t)) {
    return null;
  }
  return `own ${ownShareAmountIgnoreRefunds(t, bankAccounts, stocks).format()}`;
}

function SuffixNote({children}: {children: React.ReactNode}) {
  return (
    <span className="text-muted-foreground font-normal"> — {children}</span>
  );
}

// The row's leading icon in a rounded chip.
function RowIcon({
  Icon,
  className,
}: {
  Icon: typeof BanknotesIcon;
  className: string;
}) {
  return (
    <span
      className={cn(
        'grid h-10 w-10 flex-none place-items-center rounded-xl',
        className
      )}
    >
      <Icon className="h-5 w-5" />
    </span>
  );
}

// Title with a subtitle underneath, each truncated to one line.
function RowText({
  title,
  subtitle,
}: {
  title: React.ReactNode;
  subtitle: string;
}) {
  return (
    <span className="min-w-0 flex-1">
      <span className="text-foreground block truncate text-sm font-semibold leading-tight">
        {title}
      </span>
      <span className="text-muted-foreground mt-0.5 block truncate text-xs">
        {subtitle}
      </span>
    </span>
  );
}

// Signed amount with de-emphasised minor units, e.g. "£1,234.56" renders as
// "£1,234" with a smaller ".56". An optional note (e.g. the user's own share
// of a split) goes underneath.
function RowAmount({
  sign,
  amount,
  note,
  className,
}: {
  sign: string;
  amount: AmountWithUnit;
  note?: string | null;
  className: string;
}) {
  const {whole, fraction} = splitAmount(amount.format());
  return (
    <span className="flex-none text-right">
      <span
        className={cn(
          'block whitespace-nowrap text-sm font-semibold tabular-nums',
          className
        )}
      >
        {sign}
        {whole}
        {fraction && (
          <span className="text-muted-foreground text-xs font-normal">
            {fraction}
          </span>
        )}
      </span>
      {note && (
        <span className="text-muted-foreground mt-0.5 block text-xs tabular-nums">
          {note}
        </span>
      )}
    </span>
  );
}
