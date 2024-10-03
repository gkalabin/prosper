import {
  mostFrequentCompanion,
  mostFrequentPayer,
  mostFrequentRepaymentCategories,
} from '@/components/txform/v2/prefill';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {useDisplayCurrency} from '@/lib/context/DisplaySettingsContext';
import {BankAccount} from '@/lib/model/BankAccount';
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
  const {transactionLinks, bankAccounts} = useAllDatabaseDataContext();
  const categoryId = getValues('expense.categoryId');

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
      setValue(
        'expense.repayment.categoryId',
        // Calculate the most frequent repayment category right here and not at the top of the function
        // to avoid unnecessary computations in case the user never needs this value.
        mostFrequentRepaymentCategories(transactionLinks)[0] ?? categoryId
      );
    } else {
      setValue('expense.sharingType', 'PAID_OTHER_OWED');
      setValue('expense.currency', displayCurrency.code);
    }
    setValue('expense.payer', defaultPayer);
  };

  const setPaidSelf = () => {
    setValue('expense.sharingType', 'PAID_SELF_NOT_SHARED');
    setValue('expense.repayment', null);
    setValue('expense.companion', null);
  };

  const setAlreadyRepaid = () => {
    setValue('expense.sharingType', 'PAID_OTHER_REPAID');
    setValue(
      'expense.repayment.accountId',
      getValues('expense.accountId') ?? 0
    );
    setValue(
      'expense.repayment.categoryId',
      mostFrequentRepaymentCategories(transactionLinks)[0] ?? categoryId
    );
    setValue('expense.repayment.timestamp', getValues('expense.timestamp'));
  };

  const setOweMoney = () => {
    setValue('expense.sharingType', 'PAID_OTHER_OWED');
    setValue(
      'expense.accountId',
      getValues('expense.repayment.accountId') ?? 0
    );
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
