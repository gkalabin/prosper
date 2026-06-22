import {useDraft} from '@/components/txform/DraftContext';
import {TransactionFormSchema} from '@/components/txform/types';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {useDisplayCurrency} from '@/lib/context/DisplaySettingsContext';
import {SharingType} from '@/lib/grpc/gen/prosper/v1/ledger';
import {timestampToDate} from '@/lib/grpc/timestamp';
import {BankAccount, firstVisibleAccountId} from '@/lib/model/BankAccount';
import {
  winnerId,
  winnerMoneyNanos,
  winnerString,
  winnerTimestamp,
} from '@/lib/txsuggestions/candidate';
import {nanosToDollar} from '@/lib/util/util';
import {useFormContext} from 'react-hook-form';

export function useSharingTypeActions() {
  const {setValue, getValues} = useFormContext<TransactionFormSchema>();
  const displayCurrency = useDisplayCurrency();
  const {bankAccounts} = useCoreDataContext();
  const draft = useDraft();
  const categoryId = getValues('expense.categoryId');

  const setPaidOther = () => {
    const amountNanos = draft ? winnerMoneyNanos(draft.amount) : undefined;
    const accountId = draft ? winnerId(draft.accountFromId) : undefined;
    if (draft && amountNanos !== undefined && accountId) {
      // The user has a draft selected, which normally means an open banking transaction linked to one of their accounts.
      // At the same time, they say that the expense was paid by someone else. This likely means that the draft is
      // the repayment for the original transaction made by someone else, so fill the form using this assumption.
      setValue('expense.sharingType', SharingType.PAID_OTHER_REPAID);
      setValue(
        'expense.currency',
        currencyCodeForAccount(accountId, bankAccounts)
      );
      // The draft is for repayment, we assume the user repaid the half of the full amount paid by the original payer.
      setValue('expense.amount', nanosToDollar(amountNanos * 2n));
      setValue('expense.ownShareAmount', nanosToDollar(amountNanos));
      setValue('expense.repayment.accountId', accountId);
      const timestamp = winnerTimestamp(draft.timestamp);
      if (timestamp) {
        setValue('expense.repayment.timestamp', timestampToDate(timestamp));
      }
      setValue('expense.repayment.categoryId', categoryId);
    } else {
      setValue('expense.sharingType', SharingType.PAID_OTHER_OWED);
      setValue('expense.currency', displayCurrency.code);
    }
    setValue(
      'expense.payer',
      (draft ? winnerString(draft.payer) : undefined) ?? ''
    );
  };

  const setPaidSelf = () => {
    setValue('expense.sharingType', SharingType.PAID_SELF_NOT_SHARED);
    // Account id might be null when going from transaction paid by someone else to paid by self.
    // Make sure to set a value to avoid having invalid form state.
    setValue(
      'expense.accountId',
      getValues('expense.accountId') ?? firstVisibleAccountId(bankAccounts)
    );
    setValue('expense.repayment', null);
    setValue('expense.companion', null);
  };

  const setAlreadyRepaid = () => {
    setValue('expense.sharingType', SharingType.PAID_OTHER_REPAID);
    setValue(
      'expense.repayment.accountId',
      firstVisibleAccountId(bankAccounts)
    );
    setValue('expense.repayment.categoryId', categoryId);
    setValue('expense.repayment.timestamp', getValues('expense.timestamp'));
  };

  const setOweMoney = () => {
    setValue('expense.sharingType', SharingType.PAID_OTHER_OWED);
    setValue('expense.accountId', null);
    setValue('expense.repayment', null);
  };

  const toggleSplitTransaction = () => {
    const sharingType = getValues('expense.sharingType');
    // ownShareAmount is set by a custom hook, no need to set it here.
    if (sharingType === SharingType.PAID_SELF_SHARED) {
      setValue('expense.sharingType', SharingType.PAID_SELF_NOT_SHARED);
      setValue('expense.companion', null);
    } else if (sharingType === SharingType.PAID_SELF_NOT_SHARED) {
      setValue('expense.sharingType', SharingType.PAID_SELF_SHARED);
      setValue(
        'expense.companion',
        (draft ? winnerString(draft.companion) : undefined) ?? ''
      );
    }
  };

  return {
    setPaidOther,
    setPaidSelf,
    setAlreadyRepaid,
    setOweMoney,
    toggleSplitTransaction,
  };
}

function currencyCodeForAccount(
  accountId: number,
  bankAccounts: BankAccount[]
): string | null {
  const account = bankAccounts.find(a => a.id === accountId);
  if (!account) {
    return null;
  }
  return account.currencyCode;
}
