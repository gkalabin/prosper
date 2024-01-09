import classNames from 'classnames';
import {MoneyInputWithLabel} from 'components/forms/Input';
import {undoTailwindInputStyles} from 'components/forms/Select';
import {toDateTimeLocal} from 'components/txform/AddTransactionForm';
import {
  AccountFrom,
  Description,
  IsShared,
  OtherPartyName,
  OwnShareAmount,
  Tags,
  Timestamp,
  Trips,
  Vendor,
} from 'components/txform/FormInputs';
import {ButtonLink} from 'components/ui/buttons';
import {differenceInMonths} from 'date-fns';
import {useFormikContext} from 'formik';
import {uniqMostFrequent} from 'lib/collections';
import {useAllDatabaseDataContext} from 'lib/context/AllDatabaseDataContext';
import {Category as CategoryModel} from 'lib/model/Category';
import {
  FormMode,
  TransactionFormValues,
} from 'lib/model/forms/TransactionFormValues';
import {PersonalExpense} from 'lib/model/transaction/PersonalExpense';
import {ThirdPartyExpense} from 'lib/model/transaction/ThirdPartyExpense';
import {
  Transaction,
  isExpense,
  isPersonalExpense,
  otherPartyNameOrNull,
} from 'lib/model/transaction/Transaction';
import {TransactionPrototype} from 'lib/txsuggestions/TransactionPrototype';
import {notEmpty} from 'lib/util/util';
import {useEffect, useMemo, useState} from 'react';
import Select from 'react-select';

const SUGGESTIONS_WINDOW_MONTHS = 6;

export const FormPersonalExpense = ({
  transaction,
  prototype,
}: {
  transaction: Transaction | null;
  prototype: TransactionPrototype | null;
}) => {
  const {transactions, bankAccounts} = useAllDatabaseDataContext();
  const {
    values: {
      isShared,
      tripName,
      description,
      fromBankAccountId,
      mode,
      amount,
      vendor,
    },
    setFieldValue,
  } = useFormikContext<TransactionFormValues>();
  const transactionsForMode: PersonalExpense[] = transactions.filter(
    (x): x is PersonalExpense => isPersonalExpense(x)
  );
  const now = new Date();
  const recentTransactionsForMode = transactionsForMode.filter(
    x => differenceInMonths(now, x.timestampEpoch) < SUGGESTIONS_WINDOW_MONTHS
  );

  const [mostFrequentOtherParty] = uniqMostFrequent(
    recentTransactionsForMode.map(x => otherPartyNameOrNull(x)).filter(x => x)
  );
  useEffect(() => {
    if (transaction) {
      return;
    }
    if (isShared && mostFrequentOtherParty) {
      setFieldValue('otherPartyName', mostFrequentOtherParty);
    }
    if (!isShared) {
      setFieldValue('otherPartyName', '');
    }
  }, [isShared, setFieldValue, mostFrequentOtherParty, transaction]);

  // First, try recent transactions matching vendor.
  let [mostFrequentCategoryId] = uniqMostFrequent(
    recentTransactionsForMode
      .filter(x => !vendor || x.vendor == vendor)
      .map(x => x.categoryId)
  );
  // If no recent transactions match vendor, look for the same vendor across all transactions.
  if (!mostFrequentCategoryId) {
    [mostFrequentCategoryId] = uniqMostFrequent(
      transactionsForMode
        .filter(x => !vendor || x.vendor == vendor)
        .map(x => x.categoryId)
    );
  }
  // If this vendor is not known, just fallback to all recent transactions.
  if (!mostFrequentCategoryId) {
    [mostFrequentCategoryId] = uniqMostFrequent(
      recentTransactionsForMode.map(x => x.categoryId)
    );
  }
  useEffect(() => {
    if (transaction) {
      return;
    }
    if (mostFrequentCategoryId) {
      setFieldValue('categoryId', mostFrequentCategoryId);
    }
  }, [setFieldValue, mostFrequentCategoryId, transaction]);

  useEffect(() => {
    if (!prototype) {
      return;
    }
    const withdrawal =
      prototype.type == 'transfer' ? prototype.withdrawal : prototype;
    setFieldValue('amount', withdrawal.absoluteAmountCents / 100);
    setFieldValue('timestamp', toDateTimeLocal(withdrawal.timestampEpoch));
    setFieldValue('vendor', withdrawal.description);
    setFieldValue('fromBankAccountId', withdrawal.internalAccountId);
    setFieldValue('description', '');
  }, [prototype, setFieldValue]);

  useEffect(() => {
    if (transaction) {
      return;
    }
    if (mode == FormMode.PERSONAL) {
      const account = bankAccounts.find(a => a.id == fromBankAccountId);
      if (account) {
        setFieldValue('isShared', account.joint);
      }
    }
  }, [mode, setFieldValue, bankAccounts, fromBankAccountId, transaction]);
  useEffect(() => {
    if (!isShared) {
      setFieldValue('ownShareAmount', amount);
      return;
    }
    const newAmount = amount / 2;
    // Round new amount to the closest cent.
    const newAmountRounded = Math.round(100 * newAmount) / 100;
    setFieldValue('ownShareAmount', newAmountRounded);
  }, [amount, isShared, setFieldValue, transaction]);

  const [showNote, setShowNote] = useState(!!description);
  const [showTrip, setShowTrip] = useState(!!tripName);
  return (
    <>
      <Timestamp />
      <AccountFrom />
      <div className="col-span-3 flex">
        <IsShared />
      </div>
      {isShared && (
        <div className="col-span-3">
          <OtherPartyName />
        </div>
      )}
      <div className={classNames(isShared ? 'col-span-3' : 'col-span-6')}>
        <MoneyInputWithLabel name="amount" label="Amount" />
      </div>
      {isShared && (
        <div className="col-span-3">
          <OwnShareAmount />
        </div>
      )}
      <Vendor />
      <Tags />
      <Category />
      <div className="col-span-6 text-xs">
        Add a{' '}
        <ButtonLink
          onClick={() => {
            setShowNote(!showNote);
            setFieldValue('description', '');
          }}
        >
          note
        </ButtonLink>{' '}
        to this transaction or link it to a{' '}
        <ButtonLink
          onClick={() => {
            setShowTrip(!showTrip);
            setFieldValue('tripName', '');
          }}
        >
          trip
        </ButtonLink>
        .
      </div>
      {showTrip && <Trips />}
      {showNote && <Description />}
    </>
  );
};

const MAX_MOST_FREQUENT = 5;
export function Category() {
  const {
    isSubmitting,
    setFieldValue,
    values: {categoryId, vendor},
  } = useFormikContext<TransactionFormValues>();
  const {categories, transactions} = useAllDatabaseDataContext();
  const mostFrequentIds = useMemo(
    () => mostFrequentCategories(transactions, vendor),
    [transactions, vendor]
  );
  const mostFrequent = mostFrequentIds
    .map(id => categories.find(c => c.id() == id))
    .filter(notEmpty);

  const makeOption = (x: CategoryModel) => ({
    label: x.nameWithAncestors(),
    value: x.id(),
  });

  const options = [
    {
      label: 'Most Frequently Used',
      options: mostFrequent.slice(0, MAX_MOST_FREQUENT).map(makeOption),
    },
    {
      label: 'Children Categories',
      options: categories.filter(x => !x.children().length).map(makeOption),
    },
    {
      label: 'Parent Categories',
      options: categories.filter(x => x.children().length).map(makeOption),
    },
  ];
  return (
    <div className="col-span-6">
      <label className="block text-sm font-medium text-gray-700">
        Category
      </label>
      <Select
        styles={undoTailwindInputStyles()}
        options={options}
        value={{
          label: categories
            .find(x => x.id() == categoryId)
            ?.nameWithAncestors(),
          value: categoryId,
        }}
        onChange={newValue => setFieldValue('categoryId', newValue?.value ?? 0)}
        isDisabled={isSubmitting}
      />
    </div>
  );
}

function appendNew(target: number[], newItems: number[]): number[] {
  const existing = new Set(target);
  const newUnseen = newItems.filter(x => !existing.has(x));
  return [...target, ...newUnseen];
}

function mostFrequentCategories(
  allTransactions: Transaction[],
  vendor: string
): number[] {
  const expenses = allTransactions.filter(
    (x): x is PersonalExpense | ThirdPartyExpense => isExpense(x)
  );
  const matching = expenses.filter(x => !vendor || x.vendor == vendor);
  const now = new Date();
  const matchingRecent = matching.filter(
    x => differenceInMonths(now, x.timestampEpoch) <= 3
  );
  // Start with categories for recent transactions matching vendor.
  let result = uniqMostFrequent(matchingRecent.map(t => t.categoryId));
  if (result.length >= MAX_MOST_FREQUENT) {
    return result;
  }
  // Expand to all transactions matching vendor.
  result = appendNew(result, uniqMostFrequent(matching.map(t => t.categoryId)));
  if (result.length >= MAX_MOST_FREQUENT) {
    return result;
  }
  // At this stage, just add all categories for recent transactions.
  const recent = expenses.filter(
    x => differenceInMonths(now, x.timestampEpoch) <= 3
  );
  return appendNew(result, uniqMostFrequent(recent.map(t => t.categoryId)));
}
