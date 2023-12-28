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
import { AmountWithCurrency } from "lib/AmountWithCurrency";
import {
  useAllDatabaseDataContext,
  useDisplayBankAccounts,
} from "lib/ClientSideModel";
import { uniqMostFrequent } from "lib/collections";
import { BankAccount } from "lib/model/BankAccount";
import { Transaction } from "lib/model/Transaction";
import { AddTransactionFormValues } from "lib/transactionDbUtils";
import { TransactionPrototype } from "lib/txsuggestions/TransactionPrototype";
import { useEffect } from "react";

const SUGGESTIONS_WINDOW_MONTHS = 6;

export const TransferForm = ({
  transaction,
  prototype,
}: {
  transaction: Transaction;
  prototype: TransactionPrototype;
}) => {
  const { transactions } = useAllDatabaseDataContext();
  const {
    values: { description, fromBankAccountId, toBankAccountId },
    setFieldValue,
  } = useFormikContext<AddTransactionFormValues>();
  const bankAccounts = useDisplayBankAccounts();

  const transfers = transactions.filter((x) => x.isTransfer());
  const now = new Date();
  let [mostFrequentCategory] = uniqMostFrequent(
    transfers
      .filter(
        (x) => differenceInMonths(now, x.timestamp) < SUGGESTIONS_WINDOW_MONTHS
      )
      .filter((x) => !description || x.description == description)
      .map((x) => x.category)
  );
  if (!mostFrequentCategory) {
    [mostFrequentCategory] = uniqMostFrequent(transfers.map((x) => x.category));
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
    const proto = prototype;
    if (!proto) {
      return;
    }
    if (proto.type != "transfer") {
      throw new Error("Unknown proto type: " + proto.type);
    }
    setFieldValue("amount", proto.deposit.absoluteAmountCents / 100);
    setFieldValue("timestamp", toDateTimeLocal(proto.deposit.timestampEpoch));
    setFieldValue("description", proto.deposit.description);
    setFieldValue("fromBankAccountId", proto.withdrawal.internalAccountId);
    setFieldValue("toBankAccountId", proto.deposit.internalAccountId);
  }, [prototype, setFieldValue]);

  const fromAccount = bankAccounts.find((a) => a.id == fromBankAccountId);
  const toAccount = bankAccounts.find((a) => a.id == toBankAccountId);
  const showReceivedAmount = fromAccount.currency.id != toAccount.currency.id;
  useReceivedAmountEffect(
    fromAccount,
    toAccount,
    showReceivedAmount,
    transaction
  );
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
  fromAccount: BankAccount,
  toAccount: BankAccount,
  showReceivedAmount: boolean,
  transaction: Transaction
) {
  const { exchange } = useAllDatabaseDataContext();
  const {
    values: { amount },
    setFieldValue,
  } = useFormikContext<AddTransactionFormValues>();
  useEffect(() => {
    if (!showReceivedAmount) {
      setFieldValue("receivedAmount", amount);
      return;
    }
    if (transaction && transaction.amount().dollar() == amount) {
      setFieldValue("receivedAmount", transaction.amountReceived().dollar());
      return;
    }
    const now = new Date();
    const exchanged = exchange.exchange(
      new AmountWithCurrency({
        amountCents: Math.round(amount * 100),
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
    transaction,
  ]);
  return showReceivedAmount;
}
