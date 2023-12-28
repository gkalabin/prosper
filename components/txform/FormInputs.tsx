import { Switch } from "@headlessui/react";
import classNames from "classnames";
import {
  FormikInput,
  Input,
  MoneyInputWithLabel,
  TextInputWithLabel,
} from "components/forms/Input";
import { undoTailwindInputStyles } from "components/forms/Select";
import {
  formModeForTransaction,
  mostUsedAccountFrom,
  mostUsedAccountTo,
  mostUsedCategory,
  toDateTimeLocal,
} from "components/txform/AddTransactionForm";
import { BankAccountSelect } from "components/txform/BankAccountSelect";
import { TransactionPrototype } from "components/txform/NewTransactionSuggestions";
import { SelectNumber } from "components/txform/Select";
import { differenceInMonths, isBefore } from "date-fns";
import { useFormikContext } from "formik";
import { useAllDatabaseDataContext } from "lib/ClientSideModel";
import { Tag } from "lib/model/Tag";
import { Transaction } from "lib/model/Transaction";
import { Trip } from "lib/model/Trip";
import { shortRelativeDate } from "lib/TimeHelpers";
import { AddTransactionFormValues, FormMode } from "lib/transactionCreation";
import { useEffect } from "react";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";

export const FormInputs = (props: {
  transaction: Transaction;
  isAdvancedMode: boolean;
  prototype: TransactionPrototype;
}) => {
  const { transactions, banks } = useAllDatabaseDataContext();
  const {
    values: { amount, vendor, isFamilyExpense, fromBankAccountId, mode },
    setFieldValue,
  } = useFormikContext<AddTransactionFormValues>();

  useEffect(() => {
    // If amount is $0.05, round half of it to the closest cent.
    const halfAmount = Math.round(100 * (amount / 2)) / 100;
    setFieldValue("ownShareAmount", isFamilyExpense ? halfAmount : amount);
  }, [amount, isFamilyExpense, setFieldValue]);
  useEffect(() => {
    setFieldValue("receivedAmount", amount);
  }, [amount, setFieldValue]);

  useEffect(() => {
    if (!props.prototype) {
      return;
    }
    setFieldValue("vendor", props.prototype.vendor);
    setFieldValue("amount", Math.abs(props.prototype.amount));
    setFieldValue("timestamp", toDateTimeLocal(props.prototype.timestamp));
    if (props.prototype.accountFromId) {
      setFieldValue("fromBankAccountId", props.prototype.accountFromId);
    }
    if (props.prototype.accountToId) {
      setFieldValue("toBankAccountId", props.prototype.accountToId);
    }
  }, [props.prototype, setFieldValue]);

  useEffect(() => {
    if (props.transaction || props.prototype) {
      // Is we are editing transaction, do not autofill from/to bank account, but stick to the one from transaction.
      // If there is a prototype (suggestion from banking API), do not mess with bank account selector either.
      return;
    }
    setFieldValue("fromBankAccountId", mostUsedAccountFrom(transactions).id);
    setFieldValue("toBankAccountId", mostUsedAccountTo(transactions).id);
  }, [transactions, mode, setFieldValue, props.transaction, props.prototype]);

  useEffect(() => {
    const suggestion = mostUsedCategory(transactions, vendor);
    if (suggestion) {
      setFieldValue("categoryId", suggestion.id);
    }
  }, [vendor, transactions, mode, setFieldValue]);

  useEffect(() => {
    if (mode == FormMode.PERSONAL) {
      const account = banks
        .flatMap((b) => b.accounts)
        .find((a) => a.id == fromBankAccountId);
      setFieldValue("isFamilyExpense", account.isJoint());
    }
  }, [mode, setFieldValue, banks, fromBankAccountId]);

  return (
    <>
      {mode == FormMode.PERSONAL && (
        <PersonalExpenseForm isAdvancedMode={props.isAdvancedMode} />
      )}
      {mode == FormMode.EXTERNAL && (
        <ExternalExpenseForm isAdvancedMode={props.isAdvancedMode} />
      )}
      {mode == FormMode.TRANSFER && (
        <TransferForm isAdvancedMode={props.isAdvancedMode} />
      )}
      {mode == FormMode.INCOME && (
        <IncomeForm isAdvancedMode={props.isAdvancedMode} />
      )}
    </>
  );
};

const PersonalExpenseForm = ({
  isAdvancedMode,
}: {
  isAdvancedMode: boolean;
}) => {
  return (
    <>
      <Amount />
      {isAdvancedMode && <OwnShareAmount />}
      <IsFamilyExpense />
      <Timestamp />
      <Vendor />
      {isAdvancedMode && <Description />}
      <Tags />
      <Category />
      <AccountFrom />
      {isAdvancedMode && <Trips />}
    </>
  );
};

const ExternalExpenseForm = ({
  isAdvancedMode,
}: {
  isAdvancedMode: boolean;
}) => {
  return (
    <>
      <Amount />
      {isAdvancedMode && <OwnShareAmount />}
      <IsFamilyExpense />
      <Timestamp />
      <Vendor />
      {isAdvancedMode && <Description />}
      <Tags />
      <Category />
      <Payer />
      <Currencies />
      {isAdvancedMode && <Trips />}
    </>
  );
};

const TransferForm = ({ isAdvancedMode }: { isAdvancedMode: boolean }) => {
  return (
    <>
      <Amount />
      <ReceivedAmount />
      <Timestamp />
      <Description />
      {isAdvancedMode && <Tags />}
      <Category />
      <AccountFrom />
      <AccountTo />
    </>
  );
};

const IncomeForm = ({ isAdvancedMode }: { isAdvancedMode: boolean }) => {
  return (
    <>
      <Amount />
      <OwnShareAmount />
      <IsFamilyExpense />
      <Timestamp />
      <Vendor />
      {isAdvancedMode && <Description />}
      {isAdvancedMode && <ParentTransaction />}
      <Tags />
      <Category />
      <AccountTo />
    </>
  );
};

const Trips = () => {
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

function Amount() {
  const { isSubmitting } = useFormikContext<AddTransactionFormValues>();
  return (
    <div className="col-span-6">
      <MoneyInputWithLabel
        name="amount"
        label="Amount"
        disabled={isSubmitting}
      />
    </div>
  );
}

function OwnShareAmount() {
  const { isSubmitting } = useFormikContext<AddTransactionFormValues>();
  return (
    <div className="col-span-6">
      <MoneyInputWithLabel
        name="ownShareAmount"
        label="Own share amount"
        disabled={isSubmitting}
      />
    </div>
  );
}

function IsFamilyExpense() {
  const {
    values: { isFamilyExpense },
    isSubmitting,
    setFieldValue,
  } = useFormikContext<AddTransactionFormValues>();
  return (
    <div className="col-span-6">
      <Switch.Group>
        <div className="flex items-center">
          <div className="flex">
            <Switch
              checked={isFamilyExpense}
              onChange={() => {
                setFieldValue("isFamilyExpense", !isFamilyExpense);
              }}
              className={classNames(
                isFamilyExpense ? "bg-indigo-700" : "bg-gray-200",
                isSubmitting ? "opacity-30" : "",
                "relative inline-flex h-6 w-11 items-center rounded-full"
              )}
              disabled={isSubmitting}
            >
              <span
                className={`${
                  isFamilyExpense ? "translate-x-6" : "translate-x-1"
                } inline-block h-4 w-4 transform rounded-full bg-white transition`}
              />
            </Switch>
          </div>
          <div className="ml-4 text-sm">
            <Switch.Label className="font-medium text-gray-700">
              Shared transaction
            </Switch.Label>
            <p className="text-gray-500">
              Set the own amount to be 50% of the total.
            </p>
          </div>
        </div>
      </Switch.Group>
    </div>
  );
}

function ReceivedAmount() {
  const { isSubmitting } = useFormikContext<AddTransactionFormValues>();
  return (
    <div className="col-span-6">
      <MoneyInputWithLabel
        name="receivedAmount"
        label="Received"
        disabled={isSubmitting}
      />
    </div>
  );
}

function Timestamp() {
  const {
    values: { timestamp },
    isSubmitting,
    handleChange,
  } = useFormikContext<AddTransactionFormValues>();
  return (
    <div className="col-span-6">
      <label
        htmlFor="timestamp"
        className="block text-sm font-medium text-gray-700"
      >
        Time
      </label>
      <Input
        type="datetime-local"
        name="timestamp"
        id="timestamp"
        disabled={isSubmitting}
        className="mt-1 block w-full"
        value={timestamp}
        onChange={handleChange}
      />
    </div>
  );
}

function Vendor() {
  const {
    values: { mode },
    isSubmitting,
  } = useFormikContext<AddTransactionFormValues>();
  const { transactions } = useAllDatabaseDataContext();
  const transactionsForMode = transactions.filter(
    (x) => formModeForTransaction(x) == mode
  );
  const vendorFrequency = new Map<string, number>();
  transactionsForMode
    .filter((x) => x.hasVendor())
    .map((x) => x.vendor())
    .forEach((x) => vendorFrequency.set(x, (vendorFrequency.get(x) ?? 0) + 1));
  const vendors = [...vendorFrequency.entries()]
    .filter(([_vendor, frequency]) => frequency > 1)
    .sort(([_v1, f1], [_v2, f2]) => f2 - f1)
    .map(([vendor]) => vendor);
  return (
    <div className="col-span-6">
      <TextInputWithLabel
        name="vendor"
        label="Vendor"
        list="vendors"
        disabled={isSubmitting}
      />
      <datalist id="vendors">
        {vendors.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
    </div>
  );
}

function Description() {
  const { isSubmitting } = useFormikContext<AddTransactionFormValues>();
  return (
    <div className="col-span-6">
      <TextInputWithLabel
        name="description"
        label="Description"
        disabled={isSubmitting}
      />
    </div>
  );
}

function Tags() {
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

function ParentTransaction() {
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

function Category() {
  const { isSubmitting } = useFormikContext<AddTransactionFormValues>();
  const { categories } = useAllDatabaseDataContext();
  return (
    <div className="col-span-6">
      <SelectNumber name="categoryId" label="Category" disabled={isSubmitting}>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nameWithAncestors}
          </option>
        ))}
      </SelectNumber>
    </div>
  );
}

function Payer() {
  const { isSubmitting } = useFormikContext<AddTransactionFormValues>();
  return (
    <div className="col-span-6">
      <label
        htmlFor="payer"
        className="block text-sm font-medium text-gray-700"
      >
        Payer
      </label>
      <FormikInput
        name="payer"
        className="block w-full"
        disabled={isSubmitting}
      />
    </div>
  );
}

function AccountFrom() {
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

function AccountTo() {
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

function Currencies() {
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
