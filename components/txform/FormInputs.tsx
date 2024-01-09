import {Switch} from '@headlessui/react';
import classNames from 'classnames';
import {
  FormikInput,
  MoneyInputWithLabel,
  TextInputWithLabel,
} from 'components/forms/Input';
import {FormikSelect, undoTailwindInputStyles} from 'components/forms/Select';
import {formModeForTransaction} from 'components/txform/AddTransactionForm';
import {BankAccountSelect} from 'components/txform/BankAccountSelect';
import {FormExternalExpense} from 'components/txform/FormExternalExpense';
import {FormIncome} from 'components/txform/FormIncome';
import {FormPersonalExpense} from 'components/txform/FormPersonalExpense';
import {FormTransfer} from 'components/txform/FormTransfer';
import {differenceInMonths, isBefore} from 'date-fns';
import {useFormikContext} from 'formik';
import {shortRelativeDate} from 'lib/TimeHelpers';
import {uniqMostFrequent} from 'lib/collections';
import {useAllDatabaseDataContext} from 'lib/context/AllDatabaseDataContext';
import {Currency} from 'lib/model/Currency';
import {Trip} from 'lib/model/Trip';
import {
  FormMode,
  TransactionFormValues,
} from 'lib/model/forms/TransactionFormValues';
import {PersonalExpense} from 'lib/model/transaction/PersonalExpense';
import {
  Transaction,
  TransactionWithTrip,
  formatAmount,
  isExpense,
  isIncome,
  otherPartyNameOrNull,
} from 'lib/model/transaction/Transaction';
import {TransactionPrototype} from 'lib/txsuggestions/TransactionPrototype';
import {notEmpty} from 'lib/util/util';
import {useEffect} from 'react';
import Select from 'react-select';
import Async from 'react-select/async';
import CreatableSelect from 'react-select/creatable';

export const FormInputs = (props: {
  transaction: Transaction | null;
  prototype: TransactionPrototype | null;
}) => {
  const {
    values: {mode},
    setFieldValue,
  } = useFormikContext<TransactionFormValues>();

  useEffect(() => {
    const proto = props.prototype;
    if (!proto) {
      return;
    }
    if (proto.type == 'deposit') {
      setFieldValue('mode', FormMode.INCOME);
    } else if (proto.type == 'withdrawal') {
      setFieldValue('mode', FormMode.PERSONAL);
    } else if (proto.type == 'transfer') {
      setFieldValue('mode', FormMode.TRANSFER);
    }
  }, [props.prototype, setFieldValue]);

  return (
    <>
      {mode == FormMode.PERSONAL && <FormPersonalExpense {...props} />}
      {mode == FormMode.EXTERNAL && <FormExternalExpense {...props} />}
      {mode == FormMode.TRANSFER && <FormTransfer {...props} />}
      {mode == FormMode.INCOME && <FormIncome {...props} />}
    </>
  );
};

function hasTrip(value: Transaction): value is TransactionWithTrip {
  return !!(value as TransactionWithTrip).tripId;
}

export const Trips = () => {
  const {transactions, trips} = useAllDatabaseDataContext();
  const {isSubmitting} = useFormikContext<TransactionFormValues>();
  const transactionsWithTrips = transactions.filter(hasTrip);
  const tripLastUsageDate = new Map<number, number>();
  transactionsWithTrips.forEach(x => {
    const existing = tripLastUsageDate.get(x.tripId);
    if (!existing || isBefore(existing, x.timestampEpoch)) {
      tripLastUsageDate.set(x.tripId, x.timestampEpoch);
    }
  });
  const tripById = new Map<number, Trip>(trips.map(x => [x.id, x]));
  const tripIdsByLastUsageDate = [...tripLastUsageDate.entries()]
    .sort(([_k1, ts1], [_k2, ts2]) => ts2 - ts1)
    .map(([tripId]) => tripId);
  const tripNames = tripIdsByLastUsageDate.map(
    x => tripById.get(x)?.name ?? 'Unknown trip'
  );
  return (
    <div className="col-span-6">
      <TextInputWithLabel
        name="tripName"
        label="Trip"
        list="trips"
        disabled={isSubmitting}
      />
      <datalist id="trips">
        {tripNames.map(v => (
          <option key={v} value={v} />
        ))}
      </datalist>
    </div>
  );
};

export function OwnShareAmount() {
  return <MoneyInputWithLabel name="ownShareAmount" label="Own share amount" />;
}

export function IsShared() {
  const {
    values: {isShared},
    isSubmitting,
    setFieldValue,
  } = useFormikContext<TransactionFormValues>();
  return (
    <Switch.Group>
      <div className="flex items-center">
        <div className="flex">
          <Switch
            checked={isShared}
            onChange={() => {
              setFieldValue('isShared', !isShared);
            }}
            className={classNames(
              isShared ? 'bg-indigo-700' : 'bg-gray-200',
              isSubmitting ? 'opacity-30' : '',
              'relative inline-flex h-6 w-11 items-center rounded-full'
            )}
            disabled={isSubmitting}
          >
            <span
              className={`${
                isShared ? 'translate-x-6' : 'translate-x-1'
              } inline-block h-4 w-4 transform rounded-full bg-white transition`}
            />
          </Switch>
        </div>
        <div className="ml-4 text-sm">
          <Switch.Label className="font-medium text-gray-700">
            Split transaction
          </Switch.Label>
        </div>
      </div>
    </Switch.Group>
  );
}

export function Timestamp() {
  const {isSubmitting} = useFormikContext<TransactionFormValues>();
  return (
    <div className="col-span-6">
      <label
        htmlFor="timestamp"
        className="block text-sm font-medium text-gray-700"
      >
        Time
      </label>
      <FormikInput
        type="datetime-local"
        name="timestamp"
        disabled={isSubmitting}
        className="block w-full"
      />
    </div>
  );
}

export function Vendor() {
  const {
    values: {mode},
  } = useFormikContext<TransactionFormValues>();
  const {transactions} = useAllDatabaseDataContext();
  const transactionsForMode = transactions.filter(
    x => formModeForTransaction(x) == mode
  );
  const vendors = uniqMostFrequent(
    transactionsForMode
      .map(x => {
        if (isExpense(x)) {
          return x.vendor;
        }
        if (isIncome(x)) {
          return x.payer;
        }
        return null;
      })
      .filter(notEmpty)
  );
  return (
    <div className="col-span-6">
      <TextInputWithLabel name="vendor" label="Vendor" list="vendors" />
      <datalist id="vendors">
        {vendors.map(v => (
          <option key={v} value={v} />
        ))}
      </datalist>
    </div>
  );
}

export function Description() {
  const {
    values: {mode},
    isSubmitting,
  } = useFormikContext<TransactionFormValues>();
  const {transactions} = useAllDatabaseDataContext();
  const transactionsForMode = transactions.filter(
    x => formModeForTransaction(x) == mode
  );
  const descriptions = uniqMostFrequent(
    transactionsForMode.map(x => x.note).filter(x => x)
  );
  return (
    <div className="col-span-6">
      <TextInputWithLabel
        name="description"
        label="Description"
        list="descriptions"
        disabled={isSubmitting}
      />
      <datalist id="descriptions">
        {descriptions.map(v => (
          <option key={v} value={v} />
        ))}
      </datalist>
    </div>
  );
}

export function Tags() {
  const {
    values: {tagNames},
    isSubmitting,
    setFieldValue,
  } = useFormikContext<TransactionFormValues>();
  const {transactions, tags} = useAllDatabaseDataContext();
  const tagFrequency = new Map<number, number>(tags.map(x => [x.id, 0]));
  transactions
    .flatMap(x => x.tagsIds)
    .forEach(x => tagFrequency.set(x, (tagFrequency.get(x) ?? 0) + 1));
  const tagsByFrequency = [...tags].sort(
    (t1, t2) => (tagFrequency.get(t2.id) ?? 0) - (tagFrequency.get(t1.id) ?? 0)
  );
  const makeOption = (x: string) => ({label: x, value: x});
  return (
    <div className="col-span-6">
      <label
        htmlFor="tagNames"
        className="block text-sm font-medium text-gray-700"
      >
        Tags
      </label>
      <CreatableSelect
        isMulti
        styles={undoTailwindInputStyles()}
        options={tagsByFrequency.map(x => makeOption(x.name))}
        value={tagNames.map(x => makeOption(x))}
        onChange={newValue =>
          setFieldValue(
            'tagNames',
            newValue.map(x => x.value)
          )
        }
        isDisabled={isSubmitting}
      />
    </div>
  );
}

export function ParentTransaction() {
  const {
    values: {toBankAccountId, parentTransactionId},
    isSubmitting,
    setFieldValue,
  } = useFormikContext<TransactionFormValues>();
  const {transactions, bankAccounts, stocks} = useAllDatabaseDataContext();
  const parentTransaction = parentTransactionId
    ? transactions.find(t => t.id == parentTransactionId)
    : null;
  const parentExpense =
    parentTransaction?.kind == 'PersonalExpense' ? parentTransaction : null;
  const makeTransactionLabel = (t: PersonalExpense): string =>
    `${formatAmount(t, bankAccounts, stocks)} ${t.vendor} ${shortRelativeDate(
      t.timestampEpoch
    )}`;
  const makeOption = (t: PersonalExpense) => ({
    label: makeTransactionLabel(t),
    value: t.id,
  });
  return (
    <div className="col-span-6">
      <label className="block text-sm font-medium text-gray-700">
        Parent transaction
      </label>
      <Async
        styles={undoTailwindInputStyles()}
        isClearable
        loadOptions={async (input: string) => {
          return transactions
            .filter((t): t is PersonalExpense => t.kind == 'PersonalExpense')
            .filter(t => t.vendor.toLowerCase().includes(input.toLowerCase()))
            .slice(0, 40)
            .map(makeOption);
        }}
        defaultOptions={transactions
          .filter((t): t is PersonalExpense => t.kind == 'PersonalExpense')
          .filter(t => t.accountId == toBankAccountId)
          .filter(t => differenceInMonths(new Date(), t.timestampEpoch) < 3)
          .map(makeOption)}
        value={{
          label: parentExpense ? makeTransactionLabel(parentExpense) : 'None',
          value: parentTransactionId,
        }}
        onChange={newValue =>
          setFieldValue('parentTransactionId', newValue?.value ?? 0)
        }
        isDisabled={isSubmitting}
      />
    </div>
  );
}

export function Category() {
  const {
    isSubmitting,
    setFieldValue,
    values: {categoryId},
  } = useFormikContext<TransactionFormValues>();
  const {categories} = useAllDatabaseDataContext();
  return (
    <div className="col-span-6">
      <label className="block text-sm font-medium text-gray-700">
        Category
      </label>
      <Select
        styles={undoTailwindInputStyles()}
        options={categories.map(x => {
          return {
            label: x.nameWithAncestors(),
            value: x.id(),
          };
        })}
        value={{
          label:
            categories.find(x => x.id() == categoryId)?.nameWithAncestors() ??
            'Unknown category',
          value: categoryId,
        }}
        isClearable={false}
        // TODO: find a way to not have undefined newValue
        onChange={newValue => setFieldValue('categoryId', newValue?.value ?? 0)}
        isDisabled={isSubmitting}
      />
    </div>
  );
}

export function Payer() {
  const {isSubmitting} = useFormikContext<TransactionFormValues>();
  const {transactions} = useAllDatabaseDataContext();
  const payers = uniqMostFrequent(
    transactions
      .map(x => {
        if (isIncome(x)) {
          return x.payer;
        }
        return null;
      })
      .filter(notEmpty)
  );
  return (
    <>
      <label
        htmlFor="payer"
        className="block text-sm font-medium text-gray-700"
      >
        Payer
      </label>
      <FormikInput
        name="payer"
        list="payers"
        className="block w-full"
        disabled={isSubmitting}
      />
      <datalist id="payers">
        {payers.map(v => (
          <option key={v} value={v} />
        ))}
      </datalist>
    </>
  );
}

export function OtherPartyName() {
  const {transactions} = useAllDatabaseDataContext();
  const otherParties = uniqMostFrequent(
    transactions.map(x => otherPartyNameOrNull(x)).filter(notEmpty)
  );
  return (
    <>
      <label
        htmlFor="otherPartyName"
        className="block text-sm font-medium text-gray-700"
      >
        Shared with
      </label>
      <FormikInput
        name="otherPartyName"
        list="otherParties"
        className="block w-full"
      />
      <datalist id="otherParties">
        {otherParties.map(v => (
          <option key={v} value={v} />
        ))}
      </datalist>
    </>
  );
}

export function AccountFrom() {
  const {isSubmitting} = useFormikContext<TransactionFormValues>();
  return (
    <div className="col-span-6">
      <BankAccountSelect
        name="fromBankAccountId"
        label="Account From"
        disabled={isSubmitting}
      />
    </div>
  );
}

export function AccountTo() {
  const {isSubmitting} = useFormikContext<TransactionFormValues>();
  return (
    <div className="col-span-6">
      <BankAccountSelect
        name="toBankAccountId"
        label="Account To"
        disabled={isSubmitting}
      />
    </div>
  );
}

export function Currencies() {
  return (
    <div className="col-span-6">
      <label
        htmlFor="currencyCode"
        className="block text-sm font-medium text-gray-700"
      >
        Currency
      </label>
      <FormikSelect name="currencyCode">
        {Currency.all().map(c => (
          <option key={c.code()} value={c.code()}>
            {c.code()}
          </option>
        ))}
      </FormikSelect>
    </div>
  );
}
