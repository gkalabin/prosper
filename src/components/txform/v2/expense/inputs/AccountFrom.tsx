import {useSharingType} from '@/components/txform/v2/expense/useSharingType';
import {
  mostFrequentPayer,
  mostFrequentRepaymentCategory,
} from '@/components/txform/v2/prefill';
import {Account} from '@/components/txform/v2/shared/Account';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {Button} from '@/components/ui/button';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {useDisplayCurrency} from '@/lib/context/DisplaySettingsContext';
import {
  TransactionPrototype,
  WithdrawalOrDepositPrototype,
} from '@/lib/txsuggestions/TransactionPrototype';
import {centsToDollar} from '@/lib/util/util';
import {useMemo} from 'react';
import {useFormContext} from 'react-hook-form';

export function AccountFrom({proto}: {proto: TransactionPrototype | null}) {
  const {formState, setValue, getValues} =
    useFormContext<TransactionFormSchema>();
  const {paidSelf} = useSharingType();
  const defaultPayer = useMostFrequentPayer();
  const displayCurrency = useDisplayCurrency();
  const {transactionLinks} = useAllDatabaseDataContext();
  const simpleProto: WithdrawalOrDepositPrototype | null =
    proto?.type === 'transfer' ? proto.withdrawal : proto;
  const protoCurrency = useCurrencyCodeForProto(simpleProto);
  const categoryId = getValues('expense.categoryId');
  if (!paidSelf) {
    return <></>;
  }
  const setPaidOther = () => {
    if (simpleProto) {
      // The user has a prototype selected, which normally means an open banking transaction linked to one of their accounts.
      // At the same time, they say that the expense was paid by someone else. This likely means that the prototype is
      // the repayment for the original transaction made by someone else, so fill the form using this assumption.
      setValue('expense.sharingType', 'PAID_OTHER_REPAID');
      setValue('expense.currency', protoCurrency ?? displayCurrency.code);
      // The proto is for repayment, we assume the user repaid the half of the full amount paid by the original payer.
      setValue(
        'expense.amount',
        centsToDollar(simpleProto.absoluteAmountCents * 2)
      );
      setValue(
        'expense.ownShareAmount',
        centsToDollar(simpleProto.absoluteAmountCents)
      );
      setValue('expense.repayment.accountId', simpleProto.internalAccountId);
      setValue(
        'expense.repayment.timestamp',
        new Date(simpleProto.timestampEpoch)
      );
      setValue(
        'expense.repayment.categoryId',
        mostFrequentRepaymentCategory(transactionLinks) ?? categoryId
      );
    } else {
      setValue('expense.sharingType', 'PAID_OTHER_OWED');
      setValue('expense.currency', displayCurrency.code);
    }
    setValue('expense.payer', defaultPayer);
  };
  return (
    <>
      <Account fieldName="expense.accountId" label="I paid from" />
      <div className="col-span-6 -mt-3 text-xs">
        or{' '}
        <Button
          type="button"
          onClick={setPaidOther}
          variant="link"
          size="inherit"
          disabled={formState.isSubmitting}
        >
          someone else paid for this expense
        </Button>
        .
      </div>
    </>
  );
}

function useCurrencyCodeForProto(
  proto: WithdrawalOrDepositPrototype | null
): string | null {
  const {bankAccounts} = useAllDatabaseDataContext();
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
