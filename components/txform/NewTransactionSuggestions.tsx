import { OpenBankingTransaction as DBOpenBankingTransaction } from "@prisma/client";
import classNames from "classnames";
import { ButtonLink } from "components/ui/buttons";
import {
  differenceInHours,
  differenceInMilliseconds,
  isAfter,
  isBefore,
} from "date-fns";
import { useFormikContext } from "formik";
import { useAllDatabaseDataContext } from "lib/ClientSideModel";
import { Transaction } from "lib/model/Transaction";
import { useOpenBankingDataContext } from "lib/openbanking/context";
import {
  IOBTransaction,
  IOBTransactionsByAccountId,
} from "lib/openbanking/interface";
import { shortRelativeDate } from "lib/TimeHelpers";
import { FormMode } from "lib/transactionDbUtils";
import { useEffect, useState } from "react";

// TODO: convert this to class, so equals logic can be absracted away
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
  dbTransactions: Transaction[];
  obTransactions: IOBTransactionsByAccountId;
  usedObTransactions: DBOpenBankingTransaction[];
}) {
  const dbTxById = Object.fromEntries(
    input.dbTransactions.map((t) => [t.id, t])
  );
  const lookupList: { [obDesc: string]: { [dbDesc: string]: number } } = {};
  for (const t of input.usedObTransactions) {
    const dbTx = dbTxById[t.recordedAsId];
    const provided = t.description;
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
  for (const accountId in input.obTransactions) {
    for (const t of input.obTransactions[accountId]) {
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
    input.usedObTransactions.map((x) => [x.transaction_id, true])
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
  onItemClick: (t: TransactionPrototype) => void;
}) => {
  const { dbOpenBankingTransactions, transactions } =
    useOpenBankingDataContext();
  if (!transactions || !dbOpenBankingTransactions) {
    return <></>;
  }
  return <NonEmptyNewTransactionSuggestions {...props} />;
};

const NonEmptyNewTransactionSuggestions = (props: {
  onItemClick: (t: TransactionPrototype) => void;
}) => {
  const { dbOpenBankingTransactions, transactions: obTransactions } =
    useOpenBankingDataContext();
  const [hideBeforeLatest, setHideBeforeLatest] = useState(true);
  const { transactions: dbTransactions, banks } = useAllDatabaseDataContext();
  const prototypes = makePrototypes({
    dbTransactions,
    obTransactions,
    usedObTransactions: dbOpenBankingTransactions,
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
  dbTransactions.forEach((t) => {
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
      (a, b) =>
        protosByAccountId.get(b.id).length - protosByAccountId.get(a.id).length
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
        <h1 className="-mb-1 ml-2 text-xl font-medium">Suggestions</h1>
        <small className="ml-2 text-slate-600">
          Use the suggestions below to pre-fill the form
        </small>
        <div className="space-x-2">
          {accountsWithData.map((account) => (
            <div key={account.id} className="ml-2 inline-block">
              <ButtonLink
                onClick={() => setActiveAccount(account)}
                disabled={account.id == activeAccount.id}
              >
                {account.bank.name}: {account.name} (
                {protosByAccountId.get(account.id).length})
              </ButtonLink>
            </div>
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
      <SuggestionsList
        items={protosToDisplay}
        onItemClick={props.onItemClick}
      />
    </div>
  );
};

function SuggestionsList(props: {
  items: TransactionPrototype[];
  onItemClick: (t: TransactionPrototype) => void;
}) {
  const [limit, setLimit] = useState(5);
  const [activeItem, setActiveItem] = useState(null as TransactionPrototype);
  const onItemClick = (proto: TransactionPrototype) => {
    setActiveItem(proto);
    props.onItemClick(proto);
  };
  const displayItems = props.items.slice(0, limit);
  return (
    <ul className="divide-y divide-gray-200">
      {displayItems.map((proto) => (
        <SuggestionItem
          key={proto.openBankingTransactionId}
          proto={proto}
          isActive={
            proto?.openBankingTransactionId ==
            activeItem?.openBankingTransactionId
          }
          onClick={onItemClick}
        />
      ))}
      <li className="p-2 text-sm">
        Showing {displayItems.length} out of {props.items.length} items.<br/>Display{" "}
        <ButtonLink
          onClick={() => setLimit(Math.min(limit + 5, props.items.length))}
          disabled={limit >= props.items.length}
        >
          more
        </ButtonLink>{" or "}
        <ButtonLink
          onClick={() => setLimit(limit - 5)}
          disabled={displayItems.length <= 5}
        >
          less
        </ButtonLink> entries.
      </li>
    </ul>
  );
}

function SuggestionItem({
  proto,
  isActive,
  onClick,
}: {
  proto: TransactionPrototype;
  isActive: boolean;
  onClick: (t: TransactionPrototype) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { isSubmitting } = useFormikContext();
  return (
    <li>
      <div className={classNames("flex p-2", isActive ? "bg-gray-100" : "")}>
        <div
          className={classNames(
            "grow cursor-pointer",
            isActive ? "text-slate-500" : ""
          )}
          onClick={() => {
            if (isSubmitting) {
              return;
            }
            onClick(proto);
          }}
        >
          {proto.amount} {proto.vendor} {shortRelativeDate(proto.timestamp)}
        </div>
        <div>
          <ButtonLink onClick={() => setExpanded(!expanded)}>Raw</ButtonLink>
        </div>
      </div>
      {expanded && (
        <pre className="text-xs">{JSON.stringify(proto, null, 2)}</pre>
      )}
    </li>
  );
}
