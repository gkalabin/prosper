import {ButtonLink} from '@/components/ui/buttons';
import {uniqMostFrequent} from '@/lib/collections';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {useDisplayBankAccounts} from '@/lib/model/AllDatabaseDataModel';
import {
  Bank,
  BankAccount,
  accountUnit,
  fullAccountName,
} from '@/lib/model/BankAccount';
import {formatUnit} from '@/lib/model/Unit';
import {
  Transaction,
  isExpense,
  isIncome,
  otherPartyNameOrNull,
} from '@/lib/model/transaction/Transaction';
import {
  incomingBankAccount,
  outgoingBankAccount,
} from '@/lib/model/transaction/Transfer';
import {useOpenBankingTransactions} from '@/lib/openbanking/context';
import {
  TransactionPrototype,
  WithdrawalOrDepositPrototype,
} from '@/lib/txsuggestions/TransactionPrototype';
import {combineTransfers} from '@/lib/txsuggestions/TransfersDetection';
import {cn} from '@/lib/utils';
import {TransactionPrototype as DBTransactionPrototype} from '@prisma/client';
import assert from 'assert';
import {format} from 'date-fns';
import {useEffect, useState} from 'react';

export function fillMostCommonDescriptions(input: {
  transactions: Transaction[];
  newPrototypes: WithdrawalOrDepositPrototype[];
  usedPrototypes: DBTransactionPrototype[];
}): WithdrawalOrDepositPrototype[] {
  const externalDescriptionUsages = new Map<string, string[]>();
  for (const p of input.usedPrototypes) {
    const t = input.transactions.find(x => x.id == p.internalTransactionId);
    if (!t) {
      continue;
    }
    const external = p.externalDescription;
    let internal = t.note;
    if (isIncome(t)) {
      internal = t.payer;
    }
    if (isExpense(t)) {
      internal = t.vendor;
    }
    if (internal == '' || internal == external) {
      continue;
    }
    const usages = externalDescriptionUsages.get(external) ?? [];
    usages.push(internal);
    externalDescriptionUsages.set(external, usages);
  }

  const mostFrequentReplacements = new Map<string, string>();
  for (const [external, internalDescriptions] of externalDescriptionUsages) {
    const [mostFrequent] = uniqMostFrequent(internalDescriptions);
    mostFrequentReplacements.set(external, mostFrequent);
  }

  return input.newPrototypes.map(p => {
    p.description =
      mostFrequentReplacements.get(p.description) ?? p.description;
    return p;
  });
}

export const NewTransactionSuggestions = (props: {
  activePrototype: TransactionPrototype | null;
  onItemClick: (t: TransactionPrototype) => void;
  disabled: boolean;
}) => {
  const {transactions, isError, isLoading} = useOpenBankingTransactions();
  if (isError) {
    return (
      <div className="text-red-900">
        Error loading transactions from Open Banking
      </div>
    );
  }
  if (isLoading) {
    return <div>Loading Open Banking transactions...</div>;
  }
  if (!transactions?.length) {
    return <></>;
  }
  return (
    <NonEmptyNewTransactionSuggestions
      {...props}
      openBankingTransactions={transactions}
    />
  );
};

const NonEmptyNewTransactionSuggestions = (props: {
  openBankingTransactions: WithdrawalOrDepositPrototype[];
  activePrototype: TransactionPrototype | null;
  onItemClick: (t: TransactionPrototype) => void;
  disabled: boolean;
}) => {
  const {transactions, banks, transactionPrototypes} =
    useAllDatabaseDataContext();
  const bankAccounts = useDisplayBankAccounts();
  const withdrawalsOrDeposits = fillMostCommonDescriptions({
    transactions,
    newPrototypes: props.openBankingTransactions,
    usedPrototypes: transactionPrototypes,
  });
  const prototypes = combineTransfers(withdrawalsOrDeposits);
  const protosByAccountId = new Map<number, TransactionPrototype[]>();
  prototypes.forEach(p => {
    const append = (accountId: number) => {
      const ps = protosByAccountId.get(accountId) ?? [];
      protosByAccountId.set(accountId, [...ps, p]);
    };
    switch (p.type) {
      case 'withdrawal':
      case 'deposit':
        append(p.internalAccountId);
        break;
      case 'transfer':
        append(p.withdrawal.internalAccountId);
        append(p.deposit.internalAccountId);
        break;
    }
  });
  const accountsWithData = bankAccounts.filter(
    a => protosByAccountId.get(a.id)?.length
  );
  const [activeAccount, setActiveAccount] = useState(
    !accountsWithData.length ? null : accountsWithData[0]
  );
  const activeAccountProtos =
    protosByAccountId.get(activeAccount?.id ?? -1) ?? [];
  useEffect(() => {
    if (!activeAccountProtos.length && accountsWithData.length) {
      setActiveAccount(accountsWithData[0]);
    }
  }, [accountsWithData, activeAccountProtos.length]);
  if (!accountsWithData.length || !activeAccount) {
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
          {accountsWithData.map(account => (
            <div key={account.id} className="ml-2 inline-block">
              <ButtonLink
                onClick={() => setActiveAccount(account)}
                disabled={props.disabled || account.id == activeAccount?.id}
              >
                {fullAccountName(account, banks)}
              </ButtonLink>
            </div>
          ))}
        </div>
        <div className="px-2 pb-1 text-xs text-slate-600"></div>
      </div>
      <SuggestionsList
        items={activeAccountProtos}
        activePrototype={props.activePrototype}
        onItemClick={props.onItemClick}
        bankAccount={activeAccount}
        disabled={props.disabled}
      />
    </div>
  );
};

function SuggestionsList(props: {
  items: TransactionPrototype[];
  bankAccount: BankAccount;
  activePrototype: TransactionPrototype | null;
  onItemClick: (t: TransactionPrototype) => void;
  disabled: boolean;
}) {
  const items = props.items.sort(
    (a, b) =>
      singleOperationProto(b, props.bankAccount).timestampEpoch -
      singleOperationProto(a, props.bankAccount).timestampEpoch
  );
  const [limit, setLimit] = useState(5);
  const displayItems = items.slice(0, limit);
  const sameProto = (
    a: TransactionPrototype | null,
    b: TransactionPrototype | null
  ): boolean => {
    if (!a || !b) {
      return false;
    }
    if (a.type != b.type) {
      return false;
    }
    if (a.type == 'transfer') {
      assert(b.type == 'transfer');
      return (
        sameProto(a.deposit, b.deposit) && sameProto(a.withdrawal, b.withdrawal)
      );
    }
    assert(b.type != 'transfer');
    return a.externalTransactionId == b.externalTransactionId;
  };
  return (
    <div className="divide-y divide-gray-200">
      {displayItems.map((proto, i) => (
        <SuggestionItem
          key={i}
          proto={proto}
          isActive={sameProto(proto, props.activePrototype)}
          bankAccount={props.bankAccount}
          onClick={props.onItemClick}
          disabled={props.disabled}
        />
      ))}
      <div className="p-2 text-sm">
        Showing {displayItems.length} out of {items.length} items.
        <br />
        Display{' '}
        <ButtonLink
          onClick={() => setLimit(Math.min(limit + 5, items.length))}
          disabled={props.disabled || limit >= items.length}
        >
          more
        </ButtonLink>
        {' or '}
        <ButtonLink
          onClick={() => setLimit(limit - 5)}
          disabled={props.disabled || displayItems.length <= 5}
        >
          less
        </ButtonLink>{' '}
        entries.
      </div>
    </div>
  );
}

function summary(
  t: Transaction,
  bankAccounts: BankAccount[],
  banks: Bank[]
): string {
  switch (t.kind) {
    case 'PersonalExpense':
      return `${t.vendor} ${
        otherPartyNameOrNull(t) ? 'split with ' + otherPartyNameOrNull(t) : ''
      }`;
    case 'ThirdPartyExpense':
      return `${t.vendor} paid by ${t.payer}`;
    case 'Income':
      return `${t.payer} ${
        otherPartyNameOrNull(t) ? 'split with ' + otherPartyNameOrNull(t) : ''
      }`;
    case 'Transfer':
      const from = outgoingBankAccount(t, bankAccounts);
      const to = incomingBankAccount(t, bankAccounts);
      return `${fullAccountName(from, banks)} → ${fullAccountName(to, banks)}`;
    default:
      const _exhaustiveCheck: never = t;
      throw new Error(`Unknown transaction type for ${_exhaustiveCheck}`);
  }
}

function SuggestionItem({
  proto,
  isActive,
  bankAccount,
  onClick,
  disabled,
}: {
  proto: TransactionPrototype;
  isActive: boolean;
  bankAccount: BankAccount;
  onClick: (t: TransactionPrototype) => void;
  disabled: boolean;
}) {
  const {transactions, transactionPrototypes, bankAccounts, banks, stocks} =
    useAllDatabaseDataContext();
  const singleOpProto = singleOperationProto(proto, bankAccount);
  const usedProto = transactionPrototypes.find(p =>
    proto.type != 'transfer'
      ? p.externalId == proto.externalTransactionId
      : p.externalId == proto.withdrawal.externalTransactionId ||
        p.externalId == proto.deposit.externalTransactionId
  );
  const usedTransaction = transactions.find(
    t => t.id == usedProto?.internalTransactionId
  );
  const handleClick = () => {
    if (disabled) {
      return;
    }
    onClick(proto);
  };
  const otherAccountId =
    proto.type != 'transfer'
      ? null
      : singleOpProto.type == 'deposit'
        ? proto.withdrawal.internalAccountId
        : proto.deposit.internalAccountId;
  const otherAccount = bankAccounts.find(a => a.id == otherAccountId);
  const unit = accountUnit(bankAccount, stocks);
  return (
    <div className={cn({'bg-gray-100': isActive})}>
      <div className="flex px-2 py-1">
        <div
          className={cn('flex grow cursor-pointer', {
            'text-slate-500': isActive,
            'opacity-25': !!usedProto,
          })}
          onClick={handleClick}
        >
          <div className="grow">
            <div>{singleOpProto.description}</div>
            {proto.type == 'transfer' && otherAccount && (
              <div className="text-xs italic text-gray-600">
                Transfer {singleOpProto.type == 'deposit' ? 'from' : 'to'}{' '}
                {fullAccountName(otherAccount, banks)}
              </div>
            )}
            <div className="text-xs text-gray-600">
              {format(singleOpProto.timestampEpoch, 'yyyy-MM-dd HH:mm')}
            </div>
          </div>

          <div
            className={cn('self-center pr-2 text-lg', {
              'text-green-900': singleOpProto.type == 'deposit',
            })}
          >
            {formatUnit(unit, singleOpProto.absoluteAmountCents / 100)}
          </div>
        </div>
      </div>
      {usedTransaction && (
        <div className="ml-2 text-xs text-gray-600">
          Recorded as <i>{summary(usedTransaction, bankAccounts, banks)}</i>
        </div>
      )}
    </div>
  );
}

function singleOperationProto(
  proto: TransactionPrototype,
  bankAccount: BankAccount
): WithdrawalOrDepositPrototype {
  if (proto.type != 'transfer') {
    return proto;
  }
  if (proto.deposit.internalAccountId == bankAccount.id) {
    return proto.deposit;
  }
  if (proto.withdrawal.internalAccountId == bankAccount.id) {
    return proto.withdrawal;
  }
  throw new Error('Transfer not associated with the bank account');
}
