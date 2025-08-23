import {assert, assertDefined} from '@/lib/assert';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {
  fullAccountName,
  mustFindAccount,
  ownedAssetAccounts,
} from '@/lib/model/Account';
import {
  CategoryTree,
  getNameWithAncestors,
  mustFindCategory,
} from '@/lib/model/Category';
import {mustFindTag} from '@/lib/model/Tag';
import {
  findAllPartiesAmount,
  findInitialBalanceAmount,
  findOwnShareAmount,
  findReceivedAmount,
  findSentAmount,
} from '@/lib/model/queries/TransactionAmount';
import {
  transactionCompanionNameOrNull,
  transactionNoteOrNull,
} from '@/lib/model/queries/TransactionMetadata';
import {Expense} from '@/lib/model/transactionNEW/Expense';
import {Income} from '@/lib/model/transactionNEW/Income';
import {InitialBalance} from '@/lib/model/transactionNEW/InitialBalance';
import {Noop} from '@/lib/model/transactionNEW/Noop';
import {Transaction} from '@/lib/model/transactionNEW/Transaction';
import {Transfer} from '@/lib/model/transactionNEW/Transfer';
import {DebtRepaymentDetails} from './DebtRepaymentDetails';
import {RefundDetails} from './RefundDetails';

export function TransactionDetails({
  transaction: t,
  categoryTree,
}: {
  transaction: Transaction;
  categoryTree: CategoryTree;
}) {
  return (
    <>
      <DetailsByType transaction={t} categoryTree={categoryTree} />
      <DebtRepaymentDetails transaction={t} />
      <RefundDetails transaction={t} />
    </>
  );
}

function DetailsByType({
  transaction: t,
  categoryTree,
}: {
  transaction: Transaction;
  categoryTree: CategoryTree;
}) {
  const kind = t.kind;
  switch (kind) {
    case 'EXPENSE':
      return <ExpenseDetails transaction={t} categoryTree={categoryTree} />;
    case 'INCOME':
      return <IncomeDetails transaction={t} categoryTree={categoryTree} />;
    case 'TRANSFER':
      return <TransferDetails transaction={t} categoryTree={categoryTree} />;
    case 'INITIAL_BALANCE':
      return <InitialBalanceDetails transaction={t} />;
    case 'NOOP':
      return <NoopDetails transaction={t} />;
    default:
      const _ehaustivenessCheck: never = kind;
      throw new Error(`Unknown transaction kind: ${_ehaustivenessCheck}`);
  }
}

function NoopDetails({transaction: t}: {transaction: Noop}) {
  const {banks, accounts} = useCoreDataContext();
  const note = transactionNoteOrNull(t);
  const txAccounts = t.accountIds.map(id => mustFindAccount(id, accounts));
  return (
    <>
      <div>ID: {t.transactionId}</div>
      <div>Time: {new Date(t.timestampEpoch).toISOString()}</div>
      <div>Type: {t.kind}</div>
      {note && <div>Note: {note}</div>}
      {txAccounts.map(a => (
        <div key={a.id}>{fullAccountName(a, banks)}</div>
      ))}
      <TagsList transaction={t} />
      <Trip transaction={t} />
    </>
  );
}

function InitialBalanceDetails({
  transaction: t,
}: {
  transaction: InitialBalance;
}) {
  const {banks, accounts, stocks} = useCoreDataContext();
  const account = mustFindAccount(t.accountId, accounts);
  const balance = findInitialBalanceAmount({t, accounts, stocks});
  return (
    <>
      <div>ID: {t.transactionId}</div>
      <div>Time: {new Date(t.timestampEpoch).toISOString()}</div>
      <div>Type: {t.kind}</div>
      <div>Account: {fullAccountName(account, banks)}</div>
      <div>Balance: {balance.format()}</div>
    </>
  );
}

function TransferDetails({
  transaction: t,
  categoryTree,
}: {
  transaction: Transfer;
  categoryTree: CategoryTree;
}) {
  const {banks, accounts, stocks, categories} = useCoreDataContext();
  const category = mustFindCategory(t.categoryId, categories);
  assertDefined(category, `Tx ${t.transactionId} has no category`);
  const note = transactionNoteOrNull(t);
  const from = mustFindAccount(t.fromAccountId, accounts);
  const to = mustFindAccount(t.toAccountId, accounts);
  return (
    <>
      <div>ID: {t.transactionId}</div>
      <div>Time: {new Date(t.timestampEpoch).toISOString()}</div>
      <div>Type: {t.kind}</div>
      <div>Category: {getNameWithAncestors(category, categoryTree)}</div>
      {note && <div>Note: {note}</div>}
      <div>Sent: {findSentAmount({t, accounts, stocks}).format()}</div>
      <div>Sent from: {fullAccountName(from, banks)}</div>
      <div>Received: {findReceivedAmount({t, accounts, stocks}).format()}</div>
      <div>Received to: {fullAccountName(to, banks)}</div>
      <TagsList transaction={t} />
      <Trip transaction={t} />
    </>
  );
}

function ExpenseDetails({
  transaction: t,
  categoryTree,
}: {
  transaction: Expense;
  categoryTree: CategoryTree;
}) {
  const {banks, accounts, stocks, categories} = useCoreDataContext();
  const category = mustFindCategory(t.categorisation.categoryId, categories);
  assertDefined(category, `Tx ${t.transactionId} has no category`);
  const note = transactionNoteOrNull(t);
  const companion = transactionCompanionNameOrNull({t, accounts});
  const ownAccounts = ownedAssetAccounts(t.balanceUpdates.map(u => u.account));
  assert(ownAccounts.length == 1, `Tx ${t.transactionId} has no account`);
  const account = ownAccounts[0];
  return (
    <>
      <div>ID: {t.transactionId}</div>
      <div>Time: {new Date(t.timestampEpoch).toISOString()}</div>
      <div>Type: {t.kind}</div>
      <div>Category: {getNameWithAncestors(category, categoryTree)}</div>
      {note && <div>Note: {note}</div>}
      <div>Vendor: {t.vendor}</div>
      {companion && <div>Other party: {companion}</div>}
      <div>Spent from: {fullAccountName(account, banks)}</div>
      <div>Full amount: {findAllPartiesAmount({t, stocks}).format()}</div>
      <div>Own share: {findOwnShareAmount({t, stocks}).format()}</div>
      <TagsList transaction={t} />
      <Trip transaction={t} />
    </>
  );
}

function IncomeDetails({
  transaction: t,
  categoryTree,
}: {
  transaction: Income;
  categoryTree: CategoryTree;
}) {
  const {banks, accounts, stocks, categories} = useCoreDataContext();
  const category = mustFindCategory(t.categorisation.categoryId, categories);
  assertDefined(category, `Tx ${t.transactionId} has no category`);
  const note = transactionNoteOrNull(t);
  const companion = transactionCompanionNameOrNull({t, accounts});
  const ownAccounts = ownedAssetAccounts(t.balanceUpdates.map(u => u.account));
  assert(ownAccounts.length == 1, `Tx ${t.transactionId} has no account`);
  const account = ownAccounts[0];
  return (
    <>
      <div>ID: {t.transactionId}</div>
      <div>Time: {new Date(t.timestampEpoch).toISOString()}</div>
      <div>Type: {t.kind}</div>
      <div>Category: {getNameWithAncestors(category, categoryTree)}</div>
      {note && <div>Note: {note}</div>}
      <div>Payer: {t.payer}</div>
      {companion && <div>Other party: {companion}</div>}
      <div>Received to: {fullAccountName(account, banks)}</div>
      <div>Full amount: {findAllPartiesAmount({t, stocks}).format()}</div>
      <div>Own share: {findOwnShareAmount({t, stocks}).format()}</div>
      <TagsList transaction={t} />
      <Trip transaction={t} />
    </>
  );
}

function TagsList({
  transaction: t,
}: {
  transaction: Income | Expense | Transfer | Noop;
}) {
  const {tags: allKnownTags} = useCoreDataContext();
  const tags = t.tagsIds.map(tt => mustFindTag(tt, allKnownTags));
  if (!tags.length) {
    return null;
  }
  return <div>Tags: {tags.map(t => t.name).join(', ')}</div>;
}

function Trip({
  transaction: t,
}: {
  transaction: Income | Expense | Transfer | Noop;
}) {
  const {trips} = useCoreDataContext();
  if (!t.tripId) {
    return null;
  }
  const trip = trips.find(trip => trip.id == t.tripId);
  assertDefined(trip, `Trip ${t.tripId} is not found`);
  return <div>Trip: {trip.name}</div>;
}
