import {
  mostFrequentBankAccount,
  mostFrequentCompanion,
  mostFrequentPayer,
  mostFrequentRepaymentCategories,
} from '@/components/txform/prefill';
import {TransactionFormSchema} from '@/components/txform/types';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {useDisplayCurrency} from '@/lib/context/DisplaySettingsContext';
import {BankAccount} from '@/lib/model/BankAccount';
import {isPersonalExpense} from '@/lib/model/transaction/Transaction';
import {
  TransactionPrototype,
  WithdrawalOrDepositPrototype,
} from '@/lib/txsuggestions/TransactionPrototype';
import {centsToDollar} from '@/lib/util/util';
import {useMemo} from 'react';
import {useFormContext} from 'react-hook-form';

export function useSharingTypeActions() {
  const {setValue, getValues} = useFormContext<TransactionFormSchema>();
  const defaultPayer = useMostFrequentPayer();
  const defaultCompanion = useMostFrequentCompanion();
  const displayCurrency = useDisplayCurrency();
  const {transactionLinks, bankAccounts, transactions} =
    useAllDatabaseDataContext();
  const categoryId = getValues('expense.categoryId');

  // Use functions to avoid calculating these values when user never needs them.
  const defaultBankAccount = () =>
    mostFrequentBankAccount({
      transactions,
      bankAccounts,
      transactionToAccountId: t => (isPersonalExpense(t) ? t.accountId : null),
    });
  const defaultRepaymentCategory = () =>
    mostFrequentRepaymentCategories(transactionLinks)[0] ?? categoryId;

  const setPaidOther = (anyProto: TransactionPrototype | null) => {
    const proto: WithdrawalOrDepositPrototype | null =
      anyProto?.type === 'transfer' ? anyProto.withdrawal : anyProto;
    const protoCurrency = currencyCodeForProto(proto, bankAccounts);
    if (proto) {
      // The user has a prototype selected, which normally means an open banking transaction linked to one of their accounts.
      // At the same time, they say that the expense was paid by someone else. This likely means that the prototype is
      // the repayment for the original transaction made by someone else, so fill the form using this assumption.
      setValue('expense.sharingType', 'PAID_OTHER_REPAID');
      setValue('expense.currency', protoCurrency);
      // The proto is for repayment, we assume the user repaid the half of the full amount paid by the original payer.
      setValue('expense.amount', centsToDollar(proto.absoluteAmountCents * 2));
      setValue(
        'expense.ownShareAmount',
        centsToDollar(proto.absoluteAmountCents)
      );
      setValue('expense.repayment.accountId', proto.internalAccountId);
      setValue('expense.repayment.timestamp', new Date(proto.timestampEpoch));
      setValue('expense.repayment.categoryId', defaultRepaymentCategory());
    } else {
      setValue('expense.sharingType', 'PAID_OTHER_OWED');
      setValue('expense.currency', displayCurrency.code);
    }
    setValue('expense.payer', defaultPayer);
  };

  const setPaidSelf = () => {
    setValue('expense.sharingType', 'PAID_SELF_NOT_SHARED');
    // Account id might be null when going from transaction paid by someone else to paid by self.
    // Make sure to set a value to avoid having invalid form state.
    setValue(
      'expense.accountId',
      getValues('expense.accountId') ?? defaultBankAccount()
    );
    setValue('expense.repayment', null);
    setValue('expense.companion', null);
  };

  const setAlreadyRepaid = () => {
    setValue('expense.sharingType', 'PAID_OTHER_REPAID');
    setValue('expense.repayment.accountId', defaultBankAccount());
    setValue('expense.repayment.categoryId', defaultRepaymentCategory());
    setValue('expense.repayment.timestamp', getValues('expense.timestamp'));
  };

  const setOweMoney = () => {
    setValue('expense.sharingType', 'PAID_OTHER_OWED');
    setValue('expense.accountId', null);
    setValue('expense.repayment', null);
  };

  const toggleSplitTransaction = () => {
    const sharingType = getValues('expense.sharingType');
    // ownShareAmount is set by a custom hook, no need to set it here.
    if (sharingType === 'PAID_SELF_SHARED') {
      setValue('expense.sharingType', 'PAID_SELF_NOT_SHARED');
      setValue('expense.companion', null);
    } else if (sharingType === 'PAID_SELF_NOT_SHARED') {
      setValue('expense.sharingType', 'PAID_SELF_SHARED');
      setValue('expense.companion', defaultCompanion);
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

function currencyCodeForProto(
  proto: WithdrawalOrDepositPrototype | null,
  bankAccounts: BankAccount[]
): string | null {
  if (!proto) {
    return null;
  }
  const account = bankAccounts.find(a => a.id === proto.internalAccountId);
  if (!account) {
    return null;
  }
  return account.currencyCode;
}

function useMostFrequentPayer() {
  const {transactions} = useAllDatabaseDataContext();
  return useMemo(() => mostFrequentPayer(transactions) ?? '', [transactions]);
}

function useMostFrequentCompanion() {
  const {transactions} = useAllDatabaseDataContext();
  return useMemo(
    () => mostFrequentCompanion(transactions) ?? '',
    [transactions]
  );
}
