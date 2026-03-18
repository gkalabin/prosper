import {AmountWithUnit} from '@/lib/AmountWithUnit';
import {DBTransaction} from '@/lib/model/AllDatabaseDataModel';
import {
  BankAccount,
  accountUnit,
  mustFindBankAccount,
} from '@/lib/model/BankAccount';
import {Stock} from '@/lib/model/Stock';
import {nanosToCents} from '@/lib/util/util';
import {
  EntryLineV2 as DBEntryLine,
  LedgerAccountType,
  LedgerAccountV2,
} from '@prisma/client';

export type OpeningBalance = {
  kind: 'OpeningBalance';
  id: number;
  timestampEpoch: number;
  amountCents: number;
  accountId: number;
};

export function openingBalanceFromV2(
  tx: DBTransaction,
  accounts: Map<number, LedgerAccountV2>
): OpeningBalance {
  const {line, account} = findAssetLineAndAccount(tx, accounts);
  const amountCents = nanosToCents(line.amountNanos);
  return {
    kind: 'OpeningBalance',
    id: tx.id,
    timestampEpoch: new Date(tx.timestamp).getTime(),
    amountCents,
    accountId: account.bankAccountId!,
  };
}

function mustFindAccount(accounts: Map<number, LedgerAccountV2>, id: number) {
  const account = accounts.get(id);
  if (!account) {
    throw new Error(`Account ${id} not found`);
  }
  return account;
}

function findAssetLineAndAccount(
  tx: DBTransaction,
  accounts: Map<number, LedgerAccountV2>
): {line: DBEntryLine; account: LedgerAccountV2} {
  const assetLines = tx.lines.filter(l => {
    const acct = mustFindAccount(accounts, l.ledgerAccountId);
    return acct.type === LedgerAccountType.ASSET;
  });
  if (assetLines.length !== 1) {
    throw new Error(
      `OpeningBalance ${tx.id}: expected 1 asset line, got ${assetLines.length}`
    );
  }
  const [line] = assetLines;
  const account = mustFindAccount(accounts, line.ledgerAccountId);
  if (!account.bankAccountId) {
    throw new Error(
      `OpeningBalance ${tx.id}: asset account missing bankAccountId`
    );
  }
  return {line, account};
}

export function openingBalanceAmount(
  t: OpeningBalance,
  bankAccounts: BankAccount[],
  stocks: Stock[]
): AmountWithUnit {
  const account = mustFindBankAccount(bankAccounts, t.accountId);
  const unit = accountUnit(account, stocks);
  return new AmountWithUnit({
    amountCents: t.amountCents,
    unit,
  });
}
