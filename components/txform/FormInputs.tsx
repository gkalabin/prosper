import { Switch } from "@headlessui/react";
import classNames from "classnames";
import {
  FormikInput,
  MoneyInputWithLabel,
  TextInputWithLabel,
} from "components/forms/Input";
import { undoTailwindInputStyles } from "components/forms/Select";
import { formModeForTransaction } from "components/txform/AddTransactionForm";
import { BankAccountSelect } from "components/txform/BankAccountSelect";
import { ExternalExpenseForm } from "components/txform/ExternalExpenseForm";
import { IncomeForm } from "components/txform/IncomeForm";
import { PersonalExpenseForm } from "components/txform/PersonalExpenseForm";
import { SelectNumber } from "components/txform/Select";
import { TransferForm } from "components/txform/TransferForm";
import { differenceInMonths, isBefore } from "date-fns";
import { useFormikContext } from "formik";
import { useAllDatabaseDataContext } from "lib/ClientSideModel";
import { shortRelativeDate } from "lib/TimeHelpers";
import { uniqMostFrequent } from "lib/collections";
import { Tag } from "lib/model/Tag";
import { Transaction } from "lib/model/Transaction";
import { Trip } from "lib/model/Trip";
import { AddTransactionFormValues, FormMode } from "lib/transactionDbUtils";
import { TransactionPrototype } from "lib/txsuggestions/TransactionPrototype";
import { useEffect } from "react";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";

export const FormInputs = (props: {
  transaction: Transaction;
  prototype: TransactionPrototype;
}) => {
  const {
    values: { mode },
    setFieldValue,
    resetForm,
  } = useFormikContext<AddTransactionFormValues>();

  useEffect(() => {
    const proto = props.prototype;
    if (!proto) {
      return;
    }
    resetForm();
    if (proto.type == "deposit") {
      setFieldValue("mode", FormMode.INCOME);
    } else if (proto.type == "withdrawal") {
      setFieldValue("mode", FormMode.PERSONAL);
    } else if (proto.type == "transfer") {
      setFieldValue("mode", FormMode.TRANSFER);
    }
  }, [props.prototype, resetForm, setFieldValue]);

  return (
    <>
      {mode == FormMode.PERSONAL && <PersonalExpenseForm {...props} />}
      {mode == FormMode.EXTERNAL && <ExternalExpenseForm {...props} />}
      {mode == FormMode.TRANSFER && <TransferForm {...props} />}
      {mode == FormMode.INCOME && <IncomeForm {...props} />}
    </>
  );
};

export const Trips = () => {
  const { transactions, trips } = useAllDatabaseDataContext();
  const { isSubmitting } = useFormikContext<AddTransactionFormValues>();
  const transactionsWithTrips = transactions.filter((x) => x.hasTrip());
  const tripIds = [...new Set(transactionsWithTrips.map((x) => x.trip().id()))];
  const tripLastUsageDate = new Map<number, Date>();
  transactionsWithTrips.forEach((x) => {
    const trip = x.trip().id();
    const existing = tripLastUsageDate.get(trip);
    if (!existing || isBefore(existing, x.timestamp)) {
      tripLastUsageDate.set(trip, x.timestamp);
    }
  });
  const tripById = new Map<number, Trip>(trips.map((x) => [x.id(), x]));
  const tripNames = tripIds
    .sort((t1, t2) =>
      isBefore(tripLastUsageDate.get(t1), tripLastUsageDate.get(t2)) ? 1 : -1
    )
    .map((x) => tripById.get(x).name());
  return (
    <div className="col-span-6">
      <TextInputWithLabel
        name="tripName"
        label="Trip"
        list="trips"
        disabled={isSubmitting}
      />
      <datalist id="trips">
        {tripNames.map((v) => (
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
    values: { isShared },
    isSubmitting,
    setFieldValue,
  } = useFormikContext<AddTransactionFormValues>();
  return (
    <Switch.Group>
      <div className="flex items-center">
        <div className="flex">
          <Switch
            checked={isShared}
            onChange={() => {
              setFieldValue("isShared", !isShared);
            }}
            className={classNames(
              isShared ? "bg-indigo-700" : "bg-gray-200",
              isSubmitting ? "opacity-30" : "",
              "relative inline-flex h-6 w-11 items-center rounded-full"
            )}
            disabled={isSubmitting}
          >
            <span
              className={`${
                isShared ? "translate-x-6" : "translate-x-1"
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
  const { isSubmitting } = useFormikContext<AddTransactionFormValues>();
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
    values: { mode },
  } = useFormikContext<AddTransactionFormValues>();
  const { transactions } = useAllDatabaseDataContext();
  const transactionsForMode = transactions.filter(
    (x) => formModeForTransaction(x) == mode
  );
  const vendors = uniqMostFrequent(
    transactionsForMode.filter((x) => x.hasVendor()).map((x) => x.vendor())
  );
  return (
    <div className="col-span-6">
      <TextInputWithLabel name="vendor" label="Vendor" list="vendors" />
      <datalist id="vendors">
        {vendors.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
    </div>
  );
}

export function Description() {
  const {
    values: { mode },
    isSubmitting,
  } = useFormikContext<AddTransactionFormValues>();
  const { transactions } = useAllDatabaseDataContext();
  const transactionsForMode = transactions.filter(
    (x) => formModeForTransaction(x) == mode
  );
  const descriptionFrequency = new Map<string, number>();
  transactionsForMode
    .map((x) => x.description)
    .filter((x) => !!x)
    .forEach((x) =>
      descriptionFrequency.set(x, (descriptionFrequency.get(x) ?? 0) + 1)
    );
  const descriptions = [...descriptionFrequency.entries()]
    .sort(([_v1, f1], [_v2, f2]) => f2 - f1)
    .map(([description]) => description);
  return (
    <div className="col-span-6">
      <TextInputWithLabel
        name="description"
        label="Description"
        list="descriptions"
        disabled={isSubmitting}
      />
      <datalist id="descriptions">
        {descriptions.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
    </div>
  );
}

export function Tags() {
  const {
    values: { tagNames },
    isSubmitting,
    setFieldValue,
  } = useFormikContext<AddTransactionFormValues>();
  const { transactions, tags } = useAllDatabaseDataContext();
  const tagFrequency = new Map<Tag, number>(tags.map((x) => [x, 0]));
  transactions
    .flatMap((x) => x.tags())
    .forEach((x) => tagFrequency.set(x, (tagFrequency.get(x) ?? 0) + 1));
  const tagsByFrequency = [...tags].sort(
    (t1, t2) => tagFrequency.get(t2) - tagFrequency.get(t1)
  );
  const makeOption = (x: string) => ({ label: x, value: x });
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
        options={tagsByFrequency.map((x) => makeOption(x.name()))}
        value={tagNames.map((x) => makeOption(x))}
        onChange={(newValue) =>
          setFieldValue(
            "tagNames",
            newValue.map((x) => x.value)
          )
        }
        isDisabled={isSubmitting}
      />
    </div>
  );
}

export function ParentTransaction() {
  const {
    values: { toBankAccountId, parentTransactionId },
    isSubmitting,
    setFieldValue,
  } = useFormikContext<AddTransactionFormValues>();
  const { transactions } = useAllDatabaseDataContext();
  const makeTransactionLabel = (t: Transaction): string =>
    `${t.amount().format()} ${t.vendor()} ${shortRelativeDate(t.timestamp)}`;
  const parentTransaction = parentTransactionId
    ? transactions.find((t) => t.id == parentTransactionId)
    : null;
  return (
    <div className="col-span-6">
      <label className="block text-sm font-medium text-gray-700">
        Parent transaction
      </label>
      <Select
        styles={undoTailwindInputStyles()}
        isClearable
        options={transactions
          .filter((t) => t.isPersonalExpense())
          .filter((t) => t.accountFrom().id == toBankAccountId)
          .filter((t) => differenceInMonths(new Date(), t.timestamp) < 3)
          .map((x) => {
            return {
              label: makeTransactionLabel(x),
              value: x.id,
            };
          })}
        value={{
          label: parentTransaction
            ? makeTransactionLabel(parentTransaction)
            : "None",
          value: parentTransactionId,
        }}
        onChange={(newValue) =>
          setFieldValue("parentTransactionId", newValue?.value ?? 0)
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
    values: { categoryId },
  } = useFormikContext<AddTransactionFormValues>();
  const { categories } = useAllDatabaseDataContext();
  return (
    <div className="col-span-6">
      <label className="block text-sm font-medium text-gray-700">
        Category
      </label>
      <Select
        styles={undoTailwindInputStyles()}
        options={categories.map((x) => {
          return {
            label: x.nameWithAncestors(),
            value: x.id(),
          };
        })}
        value={{
          label: categories
            .find((x) => x.id() == categoryId)
            .nameWithAncestors(),
          value: categoryId,
        }}
        onChange={(newValue) => setFieldValue("categoryId", newValue.value)}
        isDisabled={isSubmitting}
      />
    </div>
  );
}

export function Payer() {
  const { isSubmitting } = useFormikContext<AddTransactionFormValues>();
  const { transactions } = useAllDatabaseDataContext();
  const payerFrequency = new Map<string, number>();
  transactions
    .filter((x) => x.hasPayer())
    .map((x) => x.payer())
    .forEach((x) => payerFrequency.set(x, (payerFrequency.get(x) ?? 0) + 1));
  const payers = [...payerFrequency.entries()]
    .sort(([_v1, f1], [_v2, f2]) => f2 - f1)
    .map(([value]) => value);
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
        {payers.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
    </>
  );
}

export function OtherPartyName() {
  const { transactions } = useAllDatabaseDataContext();
  const frequency = new Map<string, number>();
  transactions
    .filter((x) => x.hasOtherParty())
    .map((x) => x.otherParty())
    .forEach((x) => frequency.set(x, (frequency.get(x) ?? 0) + 1));
  const values = [...frequency.entries()]
    .sort(([_v1, f1], [_v2, f2]) => f2 - f1)
    .map(([value]) => value);
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
        {values.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
    </>
  );
}

export function AccountFrom() {
  const { isSubmitting } = useFormikContext<AddTransactionFormValues>();
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
  const { isSubmitting } = useFormikContext<AddTransactionFormValues>();
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
  const { currencies } = useAllDatabaseDataContext();
  const { isSubmitting } = useFormikContext<AddTransactionFormValues>();
  return (
    <div className="col-span-6">
      <SelectNumber name="currencyId" label="Currency" disabled={isSubmitting}>
        {currencies.all().map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </SelectNumber>
    </div>
  );
}
