import classNames from "classnames";
import { MoneyInputWithLabel } from "components/forms/Input";
import { toDateTimeLocal } from "components/txform/AddTransactionForm";
import {
  AccountTo,
  Category,
  Description,
  IsShared,
  OtherPartyName,
  OwnShareAmount,
  ParentTransaction,
  Payer,
  Tags,
  Timestamp,
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

export const FormIncome = ({
  transaction,
  prototype,
}: {
  transaction: Transaction;
  prototype: TransactionPrototype;
}) => {
  const { transactions, banks } = useAllDatabaseDataContext();
  const {
    values: { isShared, fromBankAccountId, mode, amount, payer },
    setFieldValue,
  } = useFormikContext<AddTransactionFormValues>();
  const incomeTransactions = transactions.filter((x) => x.isIncome());
  const now = new Date();
  const recentIncomeTransactions = incomeTransactions.filter(
    (x) => differenceInMonths(now, x.timestamp) < SUGGESTIONS_WINDOW_MONTHS
  );

  const [mostFrequentOtherParty] = uniqMostFrequent(
    recentIncomeTransactions
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

  let [mostFrequentCategory] = uniqMostFrequent(
    recentIncomeTransactions
      .filter((x) => !payer || (x.hasPayer() && x.payer() == payer))
      .map((x) => x.category)
  );
  if (!mostFrequentCategory) {
    [mostFrequentCategory] = uniqMostFrequent(
      incomeTransactions.map((x) => x.category)
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
    const deposit =
      prototype.type == "transfer" ? prototype.deposit : prototype;
    setFieldValue("amount", deposit.absoluteAmountCents / 100);
    setFieldValue("timestamp", toDateTimeLocal(deposit.timestampEpoch));
    setFieldValue("payer", deposit.description);
    setFieldValue("toBankAccountId", deposit.internalAccountId);
  }, [prototype, setFieldValue]);

  useEffect(() => {
    if (transaction) {
      return;
    }
    const account = banks
      .flatMap((b) => b.accounts)
      .find((a) => a.id == fromBankAccountId);
    if (account) {
      setFieldValue("isShared", account.isJoint());
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
      !transaction.amountOwnShare(transaction.currency()).isZero()
    ) {
      const transactionRatio =
        transaction.amountOwnShare(transaction.currency()).cents() /
        transaction.amount().cents();
      newAmount = transactionRatio * amount;
    }
    // Round new amount to the closest cent.
    const newAmountRounded = Math.round(100 * newAmount) / 100;
    setFieldValue("ownShareAmount", newAmountRounded);
  }, [amount, isShared, setFieldValue, transaction]);

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
          <OwnShareAmount />
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
