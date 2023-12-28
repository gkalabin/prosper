import classNames from "classnames";
import { MoneyInputWithLabel } from "components/forms/Input";
import { toDateTimeLocal } from "components/txform/AddTransactionForm";
import {
  AccountFrom,
  AccountTo,
  Category,
  Description,
  Tags,
  Timestamp,
} from "components/txform/FormInputs";
import { differenceInMonths } from "date-fns";
import { useFormikContext } from "formik";
import {
  useAllDatabaseDataContext
} from "lib/ClientSideModel";
import { uniqMostFrequent } from "lib/collections";
import { accountUnit } from "lib/model/BankAccount";
import {
  Transaction,
  Transfer,
  isTransfer,
} from "lib/model/transaction/Transaction";
import { AddTransactionFormValues } from "lib/transactionDbUtils";
import { TransactionPrototype } from "lib/txsuggestions/TransactionPrototype";
import { useEffect } from "react";

const SUGGESTIONS_WINDOW_MONTHS = 6;

export const FormTransfer = ({
  transaction,
  prototype,
}: {
  transaction: Transaction;
  prototype: TransactionPrototype;
}) => {
  const { transactions, stocks, bankAccounts } = useAllDatabaseDataContext();
  const {
    values: { description, fromBankAccountId, toBankAccountId },
    setFieldValue,
  } = useFormikContext<AddTransactionFormValues>();

  const transfers = transactions.filter((x): x is Transfer => isTransfer(x));
  const now = new Date();
  let [mostFrequentCategoryId] = uniqMostFrequent(
    transfers
      .filter(
        (x) =>
          differenceInMonths(now, x.timestampEpoch) < SUGGESTIONS_WINDOW_MONTHS
      )
      .filter((x) => !description || x.note == description)
      .map((x) => x.categoryId)
  );
  if (!mostFrequentCategoryId) {
    [mostFrequentCategoryId] = uniqMostFrequent(
      transfers.map((x) => x.categoryId)
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
    const [withdrawal, deposit] =
      prototype.type == "transfer"
        ? [prototype.withdrawal, prototype.deposit]
        : [prototype, prototype];
    setFieldValue("amount", withdrawal.absoluteAmountCents / 100);
    setFieldValue("receivedAmount", deposit.absoluteAmountCents / 100);
    setFieldValue("timestamp", toDateTimeLocal(deposit.timestampEpoch));
    setFieldValue("description", deposit.description);
    setFieldValue("fromBankAccountId", withdrawal.internalAccountId);
    setFieldValue("toBankAccountId", deposit.internalAccountId);
  }, [prototype, setFieldValue]);

  const fromAccount = bankAccounts.find((a) => a.id == fromBankAccountId);
  const toAccount = bankAccounts.find((a) => a.id == toBankAccountId);
  const showReceivedAmount =
    accountUnit(fromAccount, stocks) != accountUnit(toAccount, stocks);
  useReceivedAmountEffect(showReceivedAmount, transaction, prototype);
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
function useReceivedAmountEffect(
  showReceivedAmount: boolean,
  transaction: Transaction,
  prototype: TransactionPrototype
) {
  const {
    values: { amount },
    setFieldValue,
  } = useFormikContext<AddTransactionFormValues>();
  useEffect(() => {
    if (prototype) {
      return;
    }
    if (!showReceivedAmount || !transaction) {
      setFieldValue("receivedAmount", amount);
      return;
    }
    const amountCents = Math.round(amount * 100);
    if (isTransfer(transaction) && transaction.sentAmountCents == amountCents) {
      setFieldValue("receivedAmount", transaction.receivedAmountCents / 100);
      return;
    }
    if (!isTransfer(transaction) && transaction.amountCents == amountCents) {
      setFieldValue("receivedAmount", transaction.amountCents / 100);
      return;
    }
    setFieldValue("receivedAmount", amount);
  }, [amount, setFieldValue, showReceivedAmount, transaction, prototype]);
  return showReceivedAmount;
}
