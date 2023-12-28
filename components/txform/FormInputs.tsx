import { Switch } from "@headlessui/react";
import classNames from "classnames";
import {
  FormikInput,
  MoneyInputWithLabel,
  TextInputWithLabel,
} from "components/forms/Input";
import { undoTailwindInputStyles } from "components/forms/Select";
import {
  formModeForTransaction,
  mostUsedAccountFrom,
  mostUsedAccountTo,
  toDateTimeLocal,
} from "components/txform/AddTransactionForm";
import { BankAccountSelect } from "components/txform/BankAccountSelect";
import { TransactionPrototype } from "components/txform/NewTransactionSuggestions";
import { SelectNumber } from "components/txform/Select";
import { ButtonLink } from "components/ui/buttons";
import { differenceInMonths, isBefore } from "date-fns";
import { useFormikContext } from "formik";
import { AmountWithCurrency } from "lib/AmountWithCurrency";
import { useAllDatabaseDataContext } from "lib/ClientSideModel";
import { uniqMostFrequent } from "lib/collections";
import { Tag } from "lib/model/Tag";
import { Transaction } from "lib/model/Transaction";
import { Trip } from "lib/model/Trip";
import { shortRelativeDate } from "lib/TimeHelpers";
import { AddTransactionFormValues, FormMode } from "lib/transactionDbUtils";
import { useEffect, useState } from "react";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";

const SUGGESTIONS_WINDOW_MONTHS = 6;

export const FormInputs = (props: {
  transaction: Transaction;
  prototype: TransactionPrototype;
}) => {
  const { transactions, banks } = useAllDatabaseDataContext();
  const {
    values: { amount, vendor, isShared, fromBankAccountId, mode },
    setFieldValue,
  } = useFormikContext<AddTransactionFormValues>();
  const now = new Date();
  const recentTransactionsForMode = transactions
    .filter((x) => formModeForTransaction(x) == mode)
    .filter(
      (x) => differenceInMonths(now, x.timestamp) < SUGGESTIONS_WINDOW_MONTHS
    );

  useEffect(() => {
    // If amount is $0.05, round half of it to the closest cent.
    const halfAmount = Math.round(100 * (amount / 2)) / 100;
    setFieldValue("ownShareAmount", isShared ? halfAmount : amount);
  }, [amount, isShared, setFieldValue]);

  const [mostFrequentOtherParty] = uniqMostFrequent(
    recentTransactionsForMode
      .filter((x) => x.hasOtherParty())
      .map((x) => x.otherParty())
  );
  useEffect(() => {
    if (isShared && mostFrequentOtherParty) {
      setFieldValue("otherPartyName", mostFrequentOtherParty);
    }
    if (!isShared) {
      setFieldValue("otherPartyName", "");
    }
  }, [isShared, setFieldValue, mostFrequentOtherParty]);

  const [mostFrequentPayer] = uniqMostFrequent(
    recentTransactionsForMode.filter((x) => x.hasPayer()).map((x) => x.payer())
  );
  useEffect(() => {
    if (mostFrequentPayer) {
      setFieldValue("payer", mostFrequentPayer);
    }
  }, [setFieldValue, mostFrequentPayer]);

  const [mostFrequentCategory] = uniqMostFrequent(
    recentTransactionsForMode
      .filter((x) => !vendor || x.vendor() == vendor)
      .map((x) => x.category)
  );
  useEffect(() => {
    if (mostFrequentCategory) {
      setFieldValue("categoryId", mostFrequentCategory.id());
    }
  }, [setFieldValue, mostFrequentCategory]);

  useEffect(() => {
    if (!props.prototype) {
      return;
    }
    if (props.prototype.mode == FormMode.TRANSFER) {
      setFieldValue("description", props.prototype.vendor);
    } else {
      setFieldValue("vendor", props.prototype.vendor);
    }
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
    const from = mostUsedAccountFrom(transactions);
    if (from) {
      setFieldValue("fromBankAccountId", from.id);
    }
    const to = mostUsedAccountTo(transactions);
    if (to) {
      setFieldValue("toBankAccountId", to.id);
    }
  }, [transactions, mode, setFieldValue, props.transaction, props.prototype]);

  useEffect(() => {
    if (mode == FormMode.PERSONAL) {
      const account = banks
        .flatMap((b) => b.accounts)
        .find((a) => a.id == fromBankAccountId);
      setFieldValue("isShared", account.isJoint());
    }
  }, [mode, setFieldValue, banks, fromBankAccountId]);

  return (
    <>
      {mode == FormMode.PERSONAL && <PersonalExpenseForm />}
      {mode == FormMode.EXTERNAL && <ExternalExpenseForm />}
      {mode == FormMode.TRANSFER && <TransferForm />}
      {mode == FormMode.INCOME && <IncomeForm />}
    </>
  );
};

const PersonalExpenseForm = () => {
  const {
    values: { isShared },
    setFieldValue,
  } = useFormikContext<AddTransactionFormValues>();
  const [showNote, setShowNote] = useState(false);
  const [showTrip, setShowTrip] = useState(false);
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
      <div className={classNames(isShared ? "col-span-3" : "col-span-6")}>
        <MoneyInputWithLabel name="amount" label="Amount" />
      </div>
      {isShared && (
        <div className="col-span-3">
          <MoneyInputWithLabel name="ownShareAmount" label="Own share amount" />
        </div>
      )}
      <Vendor />
      <Tags />
      <Category />
      <div className="col-span-6 text-xs">
        Add a{" "}
        <ButtonLink
          onClick={() => {
            setShowNote(!showNote);
            setFieldValue("description", "");
          }}
        >
          note
        </ButtonLink>{" "}
        to this transaction or link it to a{" "}
        <ButtonLink
          onClick={() => {
            setShowTrip(!showTrip);
            setFieldValue("tripName", "");
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

const ExternalExpenseForm = () => {
  const { setFieldValue } = useFormikContext<AddTransactionFormValues>();
  const [showNote, setShowNote] = useState(false);
  const [showTrip, setShowTrip] = useState(false);
  return (
    <>
      <Timestamp />
      <div className="col-span-3 flex">
        <IsShared />
      </div>
      <div className="col-span-3">
        <Payer />
      </div>
      <div className="col-span-3">
        <MoneyInputWithLabel name="amount" label="Amount" />
      </div>
      <div className="col-span-3">
        <MoneyInputWithLabel name="ownShareAmount" label="Own share amount" />
      </div>
      <Vendor />
      <Tags />
      <Category />
      <Currencies />
      <div className="col-span-6 text-xs">
        Add a{" "}
        <ButtonLink
          onClick={() => {
            setShowNote(!showNote);
            setFieldValue("description", "");
          }}
        >
          note
        </ButtonLink>{" "}
        to this transaction or link it to a{" "}
        <ButtonLink
          onClick={() => {
            setShowTrip(!showTrip);
            setFieldValue("tripName", "");
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

const TransferForm = () => {
  const { bankAccounts, exchange } = useAllDatabaseDataContext();
  const {
    values: { fromBankAccountId, toBankAccountId, amount },
    setFieldValue,
  } = useFormikContext<AddTransactionFormValues>();
  const fromAccount = bankAccounts.find((a) => a.id == fromBankAccountId);
  const toAccount = bankAccounts.find((a) => a.id == toBankAccountId);
  const showReceivedAmount = fromAccount.currency.id != toAccount.currency.id;
  useEffect(() => {
    if (!showReceivedAmount) {
      setFieldValue("receivedAmount", amount);
      return;
    }
    const now = new Date();
    const exchanged = exchange.exchange(
      new AmountWithCurrency({
        amountCents: amount * 100,
        currency: fromAccount.currency,
      }),
      toAccount.currency,
      now
    );
    setFieldValue("receivedAmount", exchanged.dollar());
  }, [
    exchange,
    amount,
    setFieldValue,
    showReceivedAmount,
    fromAccount.currency,
    toAccount.currency,
  ]);
  return (
    <>
      <Timestamp />
      <AccountFrom />
      <AccountTo />
      <div
        className={classNames(showReceivedAmount ? "col-span-3" : "col-span-6")}
      >
        <MoneyInputWithLabel name="amount" label="Amount" />
      </div>
      {showReceivedAmount && (
        <div className="col-span-3">
          <MoneyInputWithLabel name="receivedAmount" label="Received" />
        </div>
      )}
      <Description />
      <Tags />
      <Category />
    </>
  );
};

const IncomeForm = () => {
  const {
    values: { isShared },
    setFieldValue,
  } = useFormikContext<AddTransactionFormValues>();
  const [showParent, setShowParent] = useState(false);
  const [showNote, setShowNote] = useState(false);
  return (
    <>
      <Timestamp />
      <AccountTo />
      <div className="col-span-3 flex">
        <IsShared />
      </div>
      {isShared && (
        <div className="col-span-3">
          <OtherPartyName />
        </div>
      )}
      <div className={classNames(isShared ? "col-span-3" : "col-span-6")}>
        <MoneyInputWithLabel name="amount" label="Amount" />
      </div>
      {isShared && (
        <div className="col-span-3">
          <MoneyInputWithLabel name="ownShareAmount" label="Own share amount" />
        </div>
      )}
      <div className="col-span-6">
        <Payer />
      </div>
      <Tags />
      <Category />
      <div className="col-span-6 text-xs">
        Add a{" "}
        <ButtonLink
          onClick={() => {
            setShowNote(!showNote);
            setFieldValue("description", "");
          }}
        >
          note
        </ButtonLink>{" "}
        or{" "}
        <ButtonLink
          onClick={() => {
            setShowParent(!showParent);
            setFieldValue("parentTransactionId", 0);
          }}
        >
          link the transaction this is the refund for
        </ButtonLink>
        .
      </div>
      {showParent && <ParentTransaction />}
      {showNote && <Description />}
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

function IsShared() {
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

function Timestamp() {
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

function Vendor() {
  const {
    values: { mode },
    isSubmitting,
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
          <option key={c.id()} value={c.id()}>
            {c.nameWithAncestors()}
          </option>
        ))}
      </SelectNumber>
    </div>
  );
}

function Payer() {
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

function OtherPartyName() {
  const { isSubmitting } = useFormikContext<AddTransactionFormValues>();
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
        disabled={isSubmitting}
      />
      <datalist id="otherParties">
        {values.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
    </>
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
