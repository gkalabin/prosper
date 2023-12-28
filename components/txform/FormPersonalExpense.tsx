import classNames from "classnames";
import { MoneyInputWithLabel } from "components/forms/Input";
import { undoTailwindInputStyles } from "components/forms/Select";
import {
  formModeForTransaction,
  toDateTimeLocal,
} from "components/txform/AddTransactionForm";
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
} from "components/txform/FormInputs";
import { ButtonLink } from "components/ui/buttons";
import { differenceInMonths } from "date-fns";
import { useFormikContext } from "formik";
import { useAllDatabaseDataContext } from "lib/ClientSideModel";
import { uniqMostFrequent } from "lib/collections";
import { Category as CategoryModel } from "lib/model/Category";
import { Transaction } from "lib/model/Transaction";
import { AddTransactionFormValues, FormMode } from "lib/transactionDbUtils";
import { TransactionPrototype } from "lib/txsuggestions/TransactionPrototype";
import { useEffect, useMemo, useState } from "react";
import Select from "react-select";

const SUGGESTIONS_WINDOW_MONTHS = 6;

export const FormPersonalExpense = ({
  transaction,
  prototype,
}: {
  transaction: Transaction;
  prototype: TransactionPrototype;
}) => {
  const { transactions, banks } = useAllDatabaseDataContext();
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
  } = useFormikContext<AddTransactionFormValues>();
  const transactionsForMode = transactions.filter(
    (x) => formModeForTransaction(x) == mode
  );
  const now = new Date();
  const recentTransactionsForMode = transactionsForMode.filter(
    (x) => differenceInMonths(now, x.timestamp) < SUGGESTIONS_WINDOW_MONTHS
  );

  const [mostFrequentOtherParty] = uniqMostFrequent(
    recentTransactionsForMode
      .filter((x) => x.hasOtherParty())
      .map((x) => x.otherParty())
  );
  useEffect(() => {
    if (transaction) {
      return;
    }
    if (isShared && mostFrequentOtherParty) {
      setFieldValue("otherPartyName", mostFrequentOtherParty);
    }
    if (!isShared) {
      setFieldValue("otherPartyName", "");
    }
  }, [isShared, setFieldValue, mostFrequentOtherParty, transaction]);

  // First, try recent transactions matching vendor.
  let [mostFrequentCategory] = uniqMostFrequent(
    recentTransactionsForMode
      .filter((x) => !vendor || (x.hasVendor() && x.vendor() == vendor))
      .map((x) => x.category)
  );
  // If no recent transactions match vendor, look for the same vendor across all transactions.
  if (!mostFrequentCategory) {
    [mostFrequentCategory] = uniqMostFrequent(
      transactionsForMode
        .filter((x) => !vendor || (x.hasVendor() && x.vendor() == vendor))
        .map((x) => x.category)
    );
  }
  // If this vendor is not known, just fallback to all recent transactions.
  if (!mostFrequentCategory) {
    [mostFrequentCategory] = uniqMostFrequent(
      recentTransactionsForMode.map((x) => x.category)
    );
  }
  useEffect(() => {
    if (transaction) {
      return;
    }
    if (mostFrequentCategory) {
      setFieldValue("categoryId", mostFrequentCategory.id());
    }
  }, [setFieldValue, mostFrequentCategory, transaction]);

  useEffect(() => {
    if (!prototype) {
      return;
    }
    const withdrawal =
      prototype.type == "transfer" ? prototype.withdrawal : prototype;
    setFieldValue("amount", withdrawal.absoluteAmountCents / 100);
    setFieldValue("timestamp", toDateTimeLocal(withdrawal.timestampEpoch));
    setFieldValue("vendor", withdrawal.description);
    setFieldValue("fromBankAccountId", withdrawal.internalAccountId);
    setFieldValue("description", "");
  }, [prototype, setFieldValue]);

  useEffect(() => {
    if (transaction) {
      return;
    }
    if (mode == FormMode.PERSONAL) {
      const account = banks
        .flatMap((b) => b.accounts)
        .find((a) => a.id == fromBankAccountId);
      if (account) {
        setFieldValue("isShared", account.isJoint());
      }
    }
  }, [mode, setFieldValue, banks, fromBankAccountId, transaction]);
  useEffect(() => {
    if (!isShared) {
      setFieldValue("ownShareAmount", amount);
      return;
    }
    let newAmount = amount / 2;
    if (
      transaction &&
      !transaction.amount().isZero() &&
      !transaction.amountOwnShare().isZero()
    ) {
      const transactionRatio =
        transaction.amountOwnShare().cents() / transaction.amount().cents();
      newAmount = transactionRatio * amount;
    }
    // Round new amount to the closest cent.
    const newAmountRounded = Math.round(100 * newAmount) / 100;
    setFieldValue("ownShareAmount", newAmountRounded);
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
      <div className={classNames(isShared ? "col-span-3" : "col-span-6")}>
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

const MAX_MOST_FREQUENT = 5;
export function Category() {
  const {
    isSubmitting,
    setFieldValue,
    values: { categoryId, vendor },
  } = useFormikContext<AddTransactionFormValues>();
  const { categories, transactions } = useAllDatabaseDataContext();
  const mostFrequent = useMemo(
    () => mostFrequentCategories(transactions, vendor),
    [transactions, vendor]
  );

  const makeOption = (x: CategoryModel) => ({
    label: x.nameWithAncestors(),
    value: x.id(),
  });

  const options = [
    {
      label: "Most Frequently Used",
      options: mostFrequent.slice(0, MAX_MOST_FREQUENT).map(makeOption),
    },
    {
      label: "Children Categories",
      options: categories.filter((x) => !x.children().length).map(makeOption),
    },
    {
      label: "Parent Categories",
      options: categories.filter((x) => !!x.children().length).map(makeOption),
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

function appendNew<T extends { id: () => number }>(
  target: T[],
  newItems: T[]
): T[] {
  const existing = new Set(target.map((x) => x.id()));
  const newDistinct = newItems.filter((x) => !existing.has(x.id()));
  return [...target, ...newDistinct];
}

function mostFrequentCategories(
  allTransactions: Transaction[],
  vendor: string
) {
  const expenses = allTransactions.filter(
    (x) => x.isPersonalExpense() || x.isThirdPartyExpense()
  );
  const matching = expenses.filter((x) => !vendor || x.vendor() == vendor);
  const now = new Date();
  const matchingRecent = matching.filter(
    (x) => differenceInMonths(now, x.timestamp) <= 3
  );
  // Start with categories for recent transactions matching vendor.
  let result = uniqMostFrequent(matchingRecent.map((t) => t.category));
  if (result.length >= MAX_MOST_FREQUENT) {
    return result;
  }
  // Expand to all transactions matching vendor.
  result = appendNew(result, uniqMostFrequent(matching.map((t) => t.category)));
  if (result.length >= MAX_MOST_FREQUENT) {
    return result;
  }
  // At this stage, just add all categories for recent transactions.
  const recent = expenses.filter(
    (x) => differenceInMonths(now, x.timestamp) <= 3
  );
  return appendNew(result, uniqMostFrequent(recent.map((t) => t.category)));
}
