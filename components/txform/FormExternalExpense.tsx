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
import { useAllDatabaseDataContext } from "lib/ClientSideModel";
import { uniqMostFrequent } from "lib/collections";
import { Transaction } from "lib/model/Transaction";
import { AddTransactionFormValues } from "lib/transactionDbUtils";
import { TransactionPrototype } from "lib/txsuggestions/TransactionPrototype";
import { useEffect, useState } from "react";

const SUGGESTIONS_WINDOW_MONTHS = 6;

export const FormExternalExpense = ({
  transaction,
}: {
  transaction: Transaction;
  prototype: TransactionPrototype;
}) => {
  const { transactions } = useAllDatabaseDataContext();
  const {
    values: { vendor, isShared, amount, description },
    setFieldValue,
  } = useFormikContext<AddTransactionFormValues>();
  const transactionsForMode = transactions.filter((x) =>
    x.isThirdPartyExpense()
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

  const [mostFrequentPayer] = uniqMostFrequent(
    recentTransactionsForMode.filter((x) => x.hasPayer()).map((x) => x.payer())
  );
  useEffect(() => {
    if (transaction) {
      return;
    }
    if (mostFrequentPayer) {
      setFieldValue("payer", mostFrequentPayer);
    }
  }, [setFieldValue, mostFrequentPayer, transaction]);

  let [mostFrequentCategory] = uniqMostFrequent(
    recentTransactionsForMode
      .filter((x) => !vendor || (x.hasVendor() && x.vendor() == vendor))
      .map((x) => x.category)
  );
  if (!mostFrequentCategory) {
    [mostFrequentCategory] = uniqMostFrequent(
      transactionsForMode.map((x) => x.category)
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
