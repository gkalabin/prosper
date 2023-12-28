import { MoneyInputWithLabel } from "components/forms/Input";
import {
  Category,
  Currencies,
  Description,
  IsShared,
  OwnShareAmount,
  Payer,
  Tags,
  Timestamp,
  Trips,
  Vendor,
} from "components/txform/FormInputs";
import { ButtonLink } from "components/ui/buttons";
import { differenceInMonths } from "date-fns";
import { useFormikContext } from "formik";
import { useAllDatabaseDataContext } from "lib/context/AllDatabaseDataContext";
import { uniqMostFrequent } from "lib/collections";
import { TransactionFormValues } from "lib/model/forms/TransactionFormValues";
import { ThirdPartyExpense } from "lib/model/transaction/ThirdPartyExpense";
import {
  Transaction,
  isThirdPartyExpense,
  otherPartyNameOrNull,
} from "lib/model/transaction/Transaction";
import { TransactionPrototype } from "lib/txsuggestions/TransactionPrototype";
import { useEffect, useState } from "react";

const SUGGESTIONS_WINDOW_MONTHS = 6;

export const FormExternalExpense = ({
  transaction,
}: {
  transaction: Transaction | null;
  prototype: TransactionPrototype | null;
}) => {
  const { transactions } = useAllDatabaseDataContext();
  const {
    values: { vendor, isShared, amount, description, tripName },
    setFieldValue,
  } = useFormikContext<TransactionFormValues>();
  const transactionsForMode = transactions.filter((x): x is ThirdPartyExpense =>
    isThirdPartyExpense(x),
  );
  const now = new Date();
  const recentTransactionsForMode = transactionsForMode.filter(
    (x) =>
      differenceInMonths(now, x.timestampEpoch) < SUGGESTIONS_WINDOW_MONTHS,
  );

  const [mostFrequentOtherParty] = uniqMostFrequent(
    recentTransactionsForMode
      .map((x) => otherPartyNameOrNull(x))
      .filter((x) => x),
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

  const [mostFrequentPayer] = uniqMostFrequent(
    recentTransactionsForMode.map((x) => x.payer),
  );
  useEffect(() => {
    if (transaction) {
      return;
    }
    if (mostFrequentPayer) {
      setFieldValue("payer", mostFrequentPayer);
    }
  }, [setFieldValue, mostFrequentPayer, transaction]);

  let [mostFrequentCategoryId] = uniqMostFrequent(
    recentTransactionsForMode
      .filter((x) => !vendor || x.vendor == vendor)
      .map((x) => x.categoryId),
  );
  if (!mostFrequentCategoryId) {
    [mostFrequentCategoryId] = uniqMostFrequent(
      transactionsForMode.map((x) => x.categoryId),
    );
  }
  useEffect(() => {
    if (transaction) {
      return;
    }
    if (mostFrequentCategoryId) {
      setFieldValue("categoryId", mostFrequentCategoryId);
    }
  }, [setFieldValue, mostFrequentCategoryId, transaction]);

  useEffect(() => {
    if (!isShared) {
      setFieldValue("ownShareAmount", amount);
      return;
    }
    const newAmount = amount / 2;
    // Round new amount to the closest cent.
    const newAmountRounded = Math.round(100 * newAmount) / 100;
    setFieldValue("ownShareAmount", newAmountRounded);
  }, [amount, isShared, setFieldValue, transaction]);

  const [showNote, setShowNote] = useState(!!description);
  const [showTrip, setShowTrip] = useState(!!tripName);
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
        <OwnShareAmount />
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
