import {
  DebtRepaymentDetails,
  RefundDetails,
} from '@/components/transactions/TransactionLinkDetails';
import {NewTransactionFormDialog} from '@/components/txform/TransactionForm';
import {Button} from '@/components/ui/button';
import {
  useCategoryTree,
  useCoreDataContext,
} from '@/lib/context/CoreDataContext';
import {fullAccountName} from '@/lib/model/BankAccount';
import {getNameWithAncestors} from '@/lib/model/Category';
import {mustFindTag} from '@/lib/model/Tag';
import {mustFindTrip} from '@/lib/model/Trip';
import {Income} from '@/lib/model/transaction/Income';
import {PersonalExpense} from '@/lib/model/transaction/PersonalExpense';
import {ThirdPartyExpense} from '@/lib/model/transaction/ThirdPartyExpense';
import {
  Transaction,
  isOpeningBalance,
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
import {PencilSquareIcon} from '@heroicons/react/24/outline';
import {format} from 'date-fns';
import {useState} from 'react';

export function TransactionDetail({transaction}: {transaction: Transaction}) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  return (
    <div className="bg-secondary/50 flex gap-3 px-3.5 pb-4">
      {/* Mirrors the row's icon column so the details line up with the row text. */}
      <div className="w-10 flex-none" />
      <div className="min-w-0 flex-1">
        <div className="border-border mb-3 border-t" />
        <dl>
          <DetailRow label="When">
            {format(transaction.timestampEpoch, 'EEE, d MMM yyyy · HH:mm')}
          </DetailRow>
          <DetailRow label="Type">{typeLabel(transaction.kind)}</DetailRow>
          <KindSpecificRows transaction={transaction} />
        </dl>
        <TagChips transaction={transaction} />
        <DebtRepaymentDetails transaction={transaction} />
        <RefundDetails transaction={transaction} />
        <Button
          variant="outline"
          size="sm"
          className="mt-4 gap-2 rounded-full"
          onClick={() => setEditDialogOpen(true)}
        >
          <PencilSquareIcon className="h-4 w-4" />
          Edit transaction
        </Button>
        <NewTransactionFormDialog
          transaction={transaction}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      </div>
    </div>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 py-1">
      <dt className="text-muted-foreground w-24 flex-none text-xs font-bold uppercase tracking-wide">
        {label}
      </dt>
      <dd className="text-foreground flex-1 text-sm leading-snug">
        {children}
      </dd>
    </div>
  );
}

function KindSpecificRows({transaction: t}: {transaction: Transaction}) {
  switch (t.kind) {
    case 'PersonalExpense':
      return <PersonalExpenseRows transaction={t} />;
    case 'ThirdPartyExpense':
      return <ThirdPartyExpenseRows transaction={t} />;
    case 'Income':
      return <IncomeRows transaction={t} />;
    case 'Transfer':
      return <TransferRows transaction={t} />;
    case 'OpeningBalance':
      return null;
  }
}

function PersonalExpenseRows({transaction: t}: {transaction: PersonalExpense}) {
  const {banks, bankAccounts, stocks} = useCoreDataContext();
  const splitWith = otherPartyName(t);
  return (
    <>
      <CategoryRow categoryId={t.categoryId} />
      <DetailRow label="Vendor">{t.vendor}</DetailRow>
      {splitWith && <DetailRow label="Split with">{splitWith}</DetailRow>}
      <DetailRow label="Account">
        {fullAccountName(transactionBankAccount(t, bankAccounts), banks)}
      </DetailRow>
      <DetailRow label="Full amount">
        {paidTotal(t, bankAccounts, stocks).format()}
      </DetailRow>
      {splitWith && (
        <DetailRow label="Own share">
          {ownShareAmountIgnoreRefunds(t, bankAccounts, stocks).format()}
        </DetailRow>
      )}
      {t.note && <DetailRow label="Note">{t.note}</DetailRow>}
      <TripRow tripId={t.tripId} />
    </>
  );
}

function ThirdPartyExpenseRows({
  transaction: t,
}: {
  transaction: ThirdPartyExpense;
}) {
  const {bankAccounts, stocks} = useCoreDataContext();
  const splitWith = otherPartyName(t);
  return (
    <>
      <CategoryRow categoryId={t.categoryId} />
      <DetailRow label="Vendor">{t.vendor}</DetailRow>
      <DetailRow label="Paid by">{t.payer}</DetailRow>
      {splitWith && <DetailRow label="Split with">{splitWith}</DetailRow>}
      <DetailRow label="Full amount">
        {paidTotal(t, bankAccounts, stocks).format()}
      </DetailRow>
      {splitWith && (
        <DetailRow label="Own share">
          {ownShareAmountIgnoreRefunds(t, bankAccounts, stocks).format()}
        </DetailRow>
      )}
      {t.note && <DetailRow label="Note">{t.note}</DetailRow>}
      <TripRow tripId={t.tripId} />
    </>
  );
}

function IncomeRows({transaction: t}: {transaction: Income}) {
  const {banks, bankAccounts, stocks} = useCoreDataContext();
  const splitWith = otherPartyName(t);
  return (
    <>
      <CategoryRow categoryId={t.categoryId} />
      <DetailRow label="Payer">{t.payer}</DetailRow>
      {splitWith && <DetailRow label="Split with">{splitWith}</DetailRow>}
      <DetailRow label="Account">
        {fullAccountName(transactionBankAccount(t, bankAccounts), banks)}
      </DetailRow>
      <DetailRow label="Full amount">
        {paidTotal(t, bankAccounts, stocks).format()}
      </DetailRow>
      {splitWith && (
        <DetailRow label="Own share">
          {ownShareAmountIgnoreRefunds(t, bankAccounts, stocks).format()}
        </DetailRow>
      )}
      {t.note && <DetailRow label="Note">{t.note}</DetailRow>}
      <TripRow tripId={t.tripId} />
    </>
  );
}

function TransferRows({transaction: t}: {transaction: Transfer}) {
  const {banks, bankAccounts, stocks} = useCoreDataContext();
  return (
    <>
      <CategoryRow categoryId={t.categoryId} />
      <DetailRow label="From">
        {fullAccountName(outgoingBankAccount(t, bankAccounts), banks)}
      </DetailRow>
      <DetailRow label="To">
        {fullAccountName(incomingBankAccount(t, bankAccounts), banks)}
      </DetailRow>
      <DetailRow label="Sent">
        {amountSent(t, bankAccounts, stocks).format()}
      </DetailRow>
      <DetailRow label="Received">
        {amountReceived(t, bankAccounts, stocks).format()}
      </DetailRow>
      {t.note && <DetailRow label="Note">{t.note}</DetailRow>}
    </>
  );
}

function CategoryRow({categoryId}: {categoryId: number}) {
  const categoryTree = useCategoryTree();
  return (
    <DetailRow label="Category">
      {getNameWithAncestors(categoryId, categoryTree)}
    </DetailRow>
  );
}

function TripRow({tripId}: {tripId: number | null}) {
  const {trips} = useCoreDataContext();
  if (!tripId) {
    return null;
  }
  return <DetailRow label="Trip">{mustFindTrip(tripId, trips).name}</DetailRow>;
}

function TagChips({transaction: t}: {transaction: Transaction}) {
  const {tags} = useCoreDataContext();
  if (isOpeningBalance(t) || !t.tagsIds.length) {
    return null;
  }
  return (
    <ul aria-label="Tags" className="mt-3 flex flex-wrap gap-2">
      {t.tagsIds.map(tagId => (
        <li
          key={tagId}
          className="bg-foreground/5 text-muted-foreground rounded-md px-2.5 py-1 text-xs font-semibold"
        >
          {mustFindTag(tagId, tags).name}
        </li>
      ))}
    </ul>
  );
}

function typeLabel(kind: Transaction['kind']): string {
  switch (kind) {
    case 'PersonalExpense':
      return 'Personal expense';
    case 'ThirdPartyExpense':
      return 'Third-party expense';
    case 'Income':
      return 'Income';
    case 'Transfer':
      return 'Transfer';
    case 'OpeningBalance':
      return 'Opening balance';
  }
}
