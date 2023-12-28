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
import {
  Income,
  Transaction,
  isIncome,
  otherPartyNameOrNull,
} from "lib/model/Transaction";
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
  const { transactions, bankAccounts } = useAllDatabaseDataContext();
  const {
    values: { isShared, fromBankAccountId, mode, amount, payer },
    setFieldValue,
  } = useFormikContext<AddTransactionFormValues>();
  const incomeTransactions = transactions.filter((x): x is Income =>
    isIncome(x)
  );
  const now = new Date();
  const recentIncomeTransactions = incomeTransactions.filter(
    (x) => differenceInMonths(now, x.timestampEpoch) < SUGGESTIONS_WINDOW_MONTHS
  );

  const [mostFrequentOtherParty] = uniqMostFrequent(
    recentIncomeTransactions
      .map((x) => otherPartyNameOrNull(x))
      .filter((x) => x)
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

  let [mostFrequentCategoryId] = uniqMostFrequent(
    recentIncomeTransactions
      .filter((x) => !payer || x.payer == payer)
      .map((x) => x.categoryId)
  );
  if (!mostFrequentCategoryId) {
    [mostFrequentCategoryId] = uniqMostFrequent(
      incomeTransactions.map((x) => x.categoryId)
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
    const account = bankAccounts.find((a) => a.id == fromBankAccountId);
    if (account) {
      setFieldValue("isShared", account.joint);
    }
  }, [mode, setFieldValue, bankAccounts, fromBankAccountId, transaction]);
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
