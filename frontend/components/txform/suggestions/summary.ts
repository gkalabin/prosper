import {FormType, TransactionDraft} from '@/lib/grpc/gen/prosper/v1/ledger';
import {Bank, BankAccount, fullAccountName} from '@/lib/model/BankAccount';
import {
  Transaction,
  otherPartyNameOrNull,
} from '@/lib/model/transaction/Transaction';
import {draftFormType} from '@/lib/model/transaction/TransactionDraft';
import {
  incomingBankAccount,
  outgoingBankAccount,
} from '@/lib/model/transaction/Transfer';
import {winnerString} from '@/lib/txsuggestions/candidate';

// draftSummary returns a one-line description of a suggested transaction.
export function draftSummary(draft: TransactionDraft): string {
  const formType = draftFormType(draft);
  switch (formType) {
    case FormType.INCOME:
      return winnerString(draft.payer, '');
    case FormType.TRANSFER:
      return winnerString(draft.description, '');
    case FormType.EXPENSE:
      return winnerString(draft.vendor, '');
    default:
      const _exhaustiveCheck: never = formType;
      throw new Error(`Cannot summarise form type ${_exhaustiveCheck}`);
  }
}

// recordedSummary returns a one-line description of a recorded transaction.
export function recordedSummary(
  t: Transaction,
  bankAccounts: BankAccount[],
  banks: Bank[]
): string {
  switch (t.kind) {
    case 'PersonalExpense':
      return `${t.vendor}${
        otherPartyNameOrNull(t) ? ' split with ' + otherPartyNameOrNull(t) : ''
      }`;
    case 'ThirdPartyExpense':
      return `${t.vendor} paid by ${t.payer}`;
    case 'Income':
      return `${t.payer}${
        otherPartyNameOrNull(t) ? ' split with ' + otherPartyNameOrNull(t) : ''
      }`;
    case 'Transfer': {
      const from = outgoingBankAccount(t, bankAccounts);
      const to = incomingBankAccount(t, bankAccounts);
      return `${fullAccountName(from, banks)} → ${fullAccountName(to, banks)}`;
    }
    case 'OpeningBalance':
      throw new Error(
        `Opening balance transaction cannot be linked, but found ${t.id}`
      );
    default:
      const _exhaustiveCheck: never = t;
      throw new Error(`Unknown transaction type for ${_exhaustiveCheck}`);
  }
}
