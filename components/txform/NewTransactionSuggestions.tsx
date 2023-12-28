import { TransactionPrototype as DBTransactionPrototype } from "@prisma/client";
import { ButtonLink } from "components/ui/buttons";
import {
  differenceInHours,
  differenceInMilliseconds,
  isAfter,
  isBefore
} from "date-fns";
import { useAllDatabaseDataContext } from "lib/ClientSideModel";
import { Transaction } from "lib/model/Transaction";
import { IOBTransaction, IOBTransactionsByAccountId } from "lib/openbanking/interface";
import { shortRelativeDate } from "lib/TimeHelpers";
import { FormMode } from "lib/transactionCreation";
import { useEffect, useState } from "react";

export type TransactionPrototype = {
  amount: number;
  vendor: string;
  timestamp: Date;
  accountFromId?: number;
  accountToId?: number;
  mode: FormMode;
  openBankingTransactionId: string;
  openBankingTransaction: IOBTransaction;
  openBankingTransaction2?: IOBTransaction;
};

export function makePrototypes(input: {
  transactions: Transaction[];
  openBankingTransactions: IOBTransactionsByAccountId;
  transactionPrototypes: DBTransactionPrototype[];
}) {
  const dbTxById = Object.fromEntries(
    input.transactions.map((t) => [t.id, t])
  );
  const lookupList: { [obDesc: string]: { [dbDesc: string]: number } } = {};
  for (const t of input.transactionPrototypes) {
    const dbTx = dbTxById[t.transactionId];
    const provided = t.openBankingDescription;
    const used = dbTx.hasVendor() ? dbTx.vendor() : dbTx.description;
    if (used == "" || used == provided) {
      continue;
    }
    lookupList[provided] ??= {};
    lookupList[provided][used] = (lookupList[provided][used] ?? 0) + 1;
  }
  const lookup = {};
  for (const [obDesc, usedMappings] of Object.entries(lookupList)) {
    const [mostUsedMapping] = Object.entries(usedMappings).sort(
      (a, b) => b[1] - a[1]
    )[0];
    lookup[obDesc] = mostUsedMapping;
  }

  const prototypes = [] as TransactionPrototype[];
  for (const accountId in input.openBankingTransactions) {
    for (const t of input.openBankingTransactions[accountId]) {
      if (t.amount == 0) {
        continue;
      }
      const proto: TransactionPrototype = {
        amount: t.amount,
        timestamp: new Date(t.timestamp),
        vendor: lookup[t.description] ?? t.description,
        mode: t.amount < 0 ? FormMode.PERSONAL : FormMode.INCOME,
        accountFromId: t.amount < 0 ? +accountId : undefined,
        accountToId: t.amount > 0 ? +accountId : undefined,
        openBankingTransactionId: t.transaction_id,
        openBankingTransaction: t,
      };
      prototypes.push(proto);
    }
  }

  const transfers = [] as TransactionPrototype[];
  const usedInTransfer = {};
  const incomePrototypes = prototypes.filter((p) => p.amount > 0);
  for (const to of incomePrototypes) {
    const fromCandidates = prototypes
      .filter(
        (from) =>
          Math.abs(from.amount + to.amount) < 0.01 &&
          isBefore(from.timestamp, to.timestamp) &&
          differenceInHours(to.timestamp, from.timestamp) < 2 &&
          from.accountFromId != to.accountToId
      )
      // sort, so the closest to `to` transfer comes first
      .sort(
        (f1, f2) =>
          differenceInMilliseconds(to.timestamp, f1.timestamp) -
          differenceInMilliseconds(to.timestamp, f2.timestamp)
      );
    if (!fromCandidates.length) {
      continue;
    }
    const from = fromCandidates[0];
    const transfer = {
      amount: to.amount,
      timestamp: from.timestamp,
      vendor: from.vendor,
      mode: FormMode.TRANSFER,
      accountFromId: from.accountFromId,
      accountToId: to.accountToId,
      openBankingTransactionId: from.openBankingTransactionId,
      openBankingTransaction: from.openBankingTransaction,
      openBankingTransaction2: to.openBankingTransaction,
    };
    transfers.push(transfer);
    usedInTransfer[from.openBankingTransactionId] = true;
    usedInTransfer[to.openBankingTransactionId] = true;
  }

  const usedInTransaction = Object.fromEntries(
    input.transactionPrototypes.map((x) => [x.openBankingTransactionId, true])
  );
  const unusedProtos = prototypes
    .filter((p) => !usedInTransfer[p.openBankingTransactionId])
    .filter((p) => !usedInTransaction[p.openBankingTransactionId]);
  const out = [...unusedProtos, ...transfers].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );

  return out;
}

export const NewTransactionSuggestions = (props: {
  openBankingTransactions: IOBTransactionsByAccountId;
  transactionPrototypes: DBTransactionPrototype[];
  onItemClick: (t: TransactionPrototype) => void;
}) => {
  const [hideBeforeLatest, setHideBeforeLatest] = useState(true);
  const [expanded, setExpanded] = useState({} as { [id: string]: boolean; });
  const [limit, setLimit] = useState({} as { [id: string]: number; });
  const { transactions, banks } = useAllDatabaseDataContext();
  const prototypes = makePrototypes({
    transactions,
    openBankingTransactions: props.openBankingTransactions,
    transactionPrototypes: props.transactionPrototypes,
  });
  const protosByAccountId = new Map<number, TransactionPrototype[]>();
  prototypes.forEach((p) => {
    const append = (accountId: number) => {
      if (!accountId) {
        return;
      }
      const ps = protosByAccountId.get(accountId) ?? [];
      protosByAccountId.set(accountId, [...ps, p]);
    };
    append(p.accountFromId);
    append(p.accountToId);
  });
  const latestTxByAccountId = new Map<number, Date>();
  transactions.forEach((t) => {
    const updateIfNewer = (accountId: number) => {
      const latest = latestTxByAccountId.get(accountId);
      if (!latest || isBefore(latest, t.timestamp)) {
        latestTxByAccountId.set(accountId, t.timestamp);
      }
    };
    if (t.hasAccountFrom()) {
      updateIfNewer(t.accountFrom().id);
    }
    if (t.hasAccountTo()) {
      updateIfNewer(t.accountTo().id);
    }
  });
  let totalHidden = 0;
  if (hideBeforeLatest) {
    for (const [accountId, latest] of latestTxByAccountId.entries()) {
      const ps = protosByAccountId.get(accountId) ?? [];
      if (!ps.length) {
        continue;
      }
      const filtered = ps.filter((p) => isAfter(p.timestamp, latest));
      protosByAccountId.set(accountId, filtered);
      totalHidden += ps.length - filtered.length;
    }
  }
  const accountsWithData = banks
    .flatMap((x) => x.accounts)
    .filter((a) => protosByAccountId.get(a.id)?.length)
    .sort(
      (a, b) => protosByAccountId.get(b.id).length - protosByAccountId.get(a.id).length
    );
  const [activeAccount, setActiveAccount] = useState(
    !accountsWithData.length ? null : accountsWithData[0]
  );
  const protosToDisplay = protosByAccountId.get(activeAccount?.id);
  useEffect(() => {
    if (!protosToDisplay?.length && accountsWithData.length) {
      setActiveAccount(accountsWithData[0]);
    }
  }, [accountsWithData, protosToDisplay, hideBeforeLatest]);
  if (!accountsWithData.length) {
    return <></>;
  }
  return (
    <div className="divide-y divide-gray-200 rounded border border-gray-200">
      <div>
        <div className="flex gap-2 p-2">
          {accountsWithData.map((account) => (
            <ButtonLink
              key={account.id}
              onClick={() => setActiveAccount(account)}
              disabled={account.id == activeAccount.id}
            >
              {account.bank.name}: {account.name} (
              {protosByAccountId.get(account.id).length})
            </ButtonLink>
          ))}
        </div>
        <div className="px-2 pb-1 text-xs text-slate-600">
          {hideBeforeLatest && (
            <span>
              Hidden {totalHidden} suggestions because there are more recent
              recorded transactions.{" "}
              <ButtonLink onClick={() => setHideBeforeLatest(false)}>
                Show them anyway.
              </ButtonLink>
            </span>
          )}
          {!hideBeforeLatest && (
            <span>
              Showing all suggestions.{" "}
              <ButtonLink onClick={() => setHideBeforeLatest(true)}>
                Hide irrelevant.
              </ButtonLink>
            </span>
          )}
        </div>
      </div>
      <ul className="divide-y divide-gray-200">
        {protosToDisplay
          .slice(0, limit[activeAccount.id] ?? 10)
          .map((proto) => (
            <li key={proto.openBankingTransactionId} className="p-2">
              <div className="flex">
                <div
                  className="grow cursor-pointer"
                  onClick={() => props.onItemClick(proto)}
                >
                  {proto.amount} {proto.vendor}{" "}
                  {shortRelativeDate(proto.timestamp)}
                </div>
                <div>
                  <ButtonLink
                    onClick={() => setExpanded((prev) => Object.assign({}, prev, {
                      [proto.openBankingTransactionId]: !prev[proto.openBankingTransactionId],
                    })
                    )}
                  >
                    Raw
                  </ButtonLink>
                </div>
              </div>
              {expanded[proto.openBankingTransactionId] && (
                <pre className="text-xs">{JSON.stringify(proto, null, 2)}</pre>
              )}
            </li>
          ))}
        <li className="p-2">
          <ButtonLink
            onClick={() => setLimit((prev) => Object.assign({}, prev, {
              [activeAccount.id]: (prev[activeAccount.id] ?? 10) + 10,
            })
            )}
          >
            More
          </ButtonLink>
        </li>
      </ul>
    </div>
  );
};
