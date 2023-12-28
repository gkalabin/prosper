import { Switch } from "@headlessui/react";
import {
  Transaction as DBTransaction,
  TransactionPrototype as DBTransactionPrototype,
} from "@prisma/client";
import { BankAccountSelect } from "components/forms/BankAccountSelect";
import {
  MoneyInputWithLabel,
  TextInputWithLabel,
} from "components/forms/Input";
import { SelectNumber } from "components/forms/Select";
import {
  ButtonFormPrimary,
  ButtonFormSecondary,
  ButtonLink,
} from "components/ui/buttons";
import { differenceInHours, format } from "date-fns";
import { Formik, FormikHelpers, useFormikContext } from "formik";
import {
  AddTransactionFormValues,
  FormMode,
  formModeForTransaction,
  formToDTO,
} from "lib/AddTransactionDataModels";
import { useCurrencyContext } from "lib/ClientSideModel";
import { Bank, BankAccount } from "lib/model/BankAccount";
import { Category } from "lib/model/Category";
import { Currency } from "lib/model/Currency";
import { Transaction } from "lib/model/Transaction";
import {
  IOBTransaction,
  IOBTransactionsByAccountId,
} from "lib/openbanking/interface";
import { shortRelativeDate } from "lib/TimeHelpers";
import { useEffect, useState } from "react";
import { FormTransactionTypeSelector } from "./FormTransactionTypeSelector";

export const InputRow = (props: {
  mode?: FormMode;
  modes?: FormMode[];
  children: JSX.Element | JSX.Element[];
}) => {
  const field = (
    // To make 2 columns: <div className="col-span-6 sm:col-span-3">
    <div className="col-span-6">{props.children}</div>
  );
  if (!props.modes || props.modes.includes(props.mode)) {
    return field;
  }
  return <></>;
};

export function toDateTimeLocal(d: Date) {
  // 2022-12-19T18:05:59
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

function initialValuesForTransaction(
  t: Transaction,
  defaultAccountFrom: BankAccount,
  defaultAccountTo: BankAccount
): AddTransactionFormValues {
  const defaults: AddTransactionFormValues = {
    // 2022-12-19T18:05:59
    timestamp: toDateTimeLocal(t.timestamp),
    vendor: t.vendor(),
    description: t.description,
    amount: t.amount().dollar(),
    ownShareAmount: t.amount().dollar(),
    receivedAmount: t.amount().dollar(),
    fromBankAccountId: (t.accountFrom() ?? defaultAccountFrom).id,
    toBankAccountId: (t.accountTo() ?? defaultAccountTo).id,
    categoryId: t.category.id,
    currencyId: t.currency().id,
    isFamilyExpense: t.isFamilyExpense(),
  };
  if (t.isTransfer()) {
    defaults.receivedAmount = t.amountReceived().dollar();
  }
  if (t.isPersonalExpense() || t.isThirdPartyExpense() || t.isIncome()) {
    defaults.ownShareAmount = t.amountOwnShare().dollar();
  }
  return defaults;
}

function initialValuesEmpty(
  defaultAccountFrom: BankAccount,
  defaultAccountTo: BankAccount,
  defaultCategory: Category,
  defaultCurrency: Currency
): AddTransactionFormValues {
  const now = new Date();
  return {
    timestamp: toDateTimeLocal(now),
    vendor: "",
    description: "",
    amount: 0,
    ownShareAmount: 0,
    receivedAmount: 0,
    fromBankAccountId: defaultAccountFrom.id,
    toBankAccountId: defaultAccountTo.id,
    categoryId: defaultCategory.id,
    currencyId: defaultCurrency.id,
    isFamilyExpense: false,
  };
}

function mostUsedAccountFrom(mode: FormMode, txs: Transaction[]): BankAccount {
  const accounts = txs
    .filter((x) => {
      if (mode == FormMode.PERSONAL) {
        return x.isPersonalExpense();
      }
      if (mode == FormMode.TRANSFER) {
        return x.isTransfer();
      }
      return true;
    })
    .map((x) => x.accountFrom())
    .filter((x) => !!x);
  return mostFrequent(accounts);
}

function mostUsedCategory(
  mode: FormMode,
  txs: Transaction[],
  vendor: string
): Category {
  const categories = txs
    .filter((x) => {
      switch (mode) {
        case FormMode.PERSONAL:
          return x.isPersonalExpense();
        case FormMode.INCOME:
          return x.isIncome();
        case FormMode.EXTERNAL:
          return x.isThirdPartyExpense();
        default:
          return false;
      }
    })
    .filter((x) => vendor == "" || x.vendor() == vendor)
    .map((x) => x.category)
    .filter((x) => !!x);
  return mostFrequent(categories);
}

function mostUsedAccountTo(mode: FormMode, txs: Transaction[]): BankAccount {
  const accounts = txs
    .filter((x) => {
      if (mode == FormMode.INCOME) {
        return x.isIncome();
      }
      if (mode == FormMode.TRANSFER) {
        return x.isTransfer();
      }
      return true;
    })
    .map((x) => x.accountTo())
    .filter((x) => !!x);
  return mostFrequent(accounts);
}

function mostFrequent<T extends { id: number }>(items: T[]): T {
  if (!items.length) {
    return null;
  }
  const itemById = {};
  const frequencyById: { [id: number]: number } = {};
  items.forEach((x) => {
    itemById[x.id] = x;
    frequencyById[x.id] ??= 0;
    frequencyById[x.id]++;
  });
  const mostFrequentId = Object.entries(frequencyById).sort(
    (a, b) => b[1] - a[1]
  )[0][0];
  return itemById[mostFrequentId];
}

type TransactionPrototype = {
  amount: number;
  vendor: string;
  timestamp: Date;
  accountFromId?: number;
  accountToId?: number;
  mode: FormMode;
  openBankingTransactionId: string;
  openBankingTransaction: IOBTransaction;
  openBankingTransaction2?: IOBTransaction;
};

function makePrototypes(input: {
  allTransactions: Transaction[];
  openBankingTransactions: IOBTransactionsByAccountId;
  transactionPrototypes: DBTransactionPrototype[];
}) {
  const dbTxById = Object.fromEntries(
    input.allTransactions.map((t) => [t.id, t])
  );
  const lookupList: { [obDesc: string]: { [dbDesc: string]: number } } = {};
  for (const t of input.transactionPrototypes) {
    const dbTx = dbTxById[t.transactionId];
    const provided = t.openBankingDescription;
    const used = dbTx.hasVendor() ? dbTx.vendor() : dbTx.description;
    if (used == "" || used == provided) {
      continue;
    }
    lookupList[provided] ??= {};
    lookupList[provided][used] ??= 0;
    lookupList[provided][used]++;
  }
  const lookup = {};
  for (const obDesc of Object.keys(lookupList)) {
    const [dbDesc] = Object.entries(lookupList[obDesc]).sort(
      (a, b) => b[1] - a[1]
    )[0];
    lookup[obDesc] = dbDesc;
  }

  const prototypes = [] as TransactionPrototype[];
  for (const accountId in input.openBankingTransactions) {
    for (const t of input.openBankingTransactions[accountId]) {
      if (t.amount == 0) {
        continue;
      }
      const proto: TransactionPrototype = {
        amount: t.amount,
        timestamp: new Date(t.timestamp),
        vendor: lookup[t.description] ?? t.description,
        mode: t.amount < 0 ? FormMode.PERSONAL : FormMode.INCOME,
        accountFromId: t.amount < 0 ? +accountId : undefined,
        accountToId: t.amount > 0 ? +accountId : undefined,
        openBankingTransactionId: t.transaction_id,
        openBankingTransaction: t,
      };
      prototypes.push(proto);
    }
  }

  const transfers = [] as TransactionPrototype[];
  const usedInTransfer = {};
  for (const to of prototypes) {
    if (to.amount < 0) {
      continue;
    }
    for (const from of prototypes) {
      if (Math.abs(from.amount + to.amount) >= 0.01) {
        continue;
      }
      if (Math.abs(differenceInHours(from.timestamp, to.timestamp)) > 3) {
        continue;
      }
      if (from.accountFromId == to.accountToId) {
        continue;
      }
      const transfer = {
        amount: to.amount,
        timestamp: from.timestamp,
        vendor: from.vendor,
        mode: FormMode.TRANSFER,
        accountFromId: from.accountFromId,
        accountToId: to.accountToId,
        openBankingTransactionId: from.openBankingTransactionId,
        openBankingTransaction: from.openBankingTransaction,
        openBankingTransaction2: to.openBankingTransaction,
      };
      transfers.push(transfer);
      usedInTransfer[from.openBankingTransactionId] = true;
      usedInTransfer[to.openBankingTransactionId] = true;
    }
  }

  const usedInTransaction = Object.fromEntries(
    input.transactionPrototypes.map((x) => [x.openBankingTransactionId, true])
  );
  const unusedProtos = prototypes
    .filter((p) => !usedInTransfer[p.openBankingTransactionId])
    .filter((p) => !usedInTransaction[p.openBankingTransactionId]);
  const out = [...unusedProtos, ...transfers].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );

  return out;
}

const NewTransactionSuggestions = (props: {
  banks: Bank[];
  openBankingTransactions: IOBTransactionsByAccountId;
  transactionPrototypes: DBTransactionPrototype[];
  allTransactions: Transaction[];
  onItemClick: (t: TransactionPrototype) => void;
}) => {
  const prototypes = makePrototypes({
    allTransactions: props.allTransactions,
    openBankingTransactions: props.openBankingTransactions,
    transactionPrototypes: props.transactionPrototypes,
  });
  const accountsWithData = props.banks
    .flatMap((x) => x.accounts)
    .filter((a) =>
      prototypes.find((p) => p.accountFromId == a.id || p.accountToId == a.id)
    );
  const protosByAccountId = Object.fromEntries(
    accountsWithData.map((a) => {
      const protos = prototypes.filter(
        (p) => p.accountFromId == a.id || p.accountToId == a.id
      );
      return [a.id, protos];
    })
  );
  accountsWithData.sort(
    (a, b) => protosByAccountId[b.id].length - protosByAccountId[a.id].length
  );
  const [activeAccount, setActiveAccount] = useState(
    !accountsWithData.length ? null : accountsWithData[0]
  );
  const [expanded, setExpanded] = useState({} as { [id: string]: boolean });
  const [limit, setLimit] = useState({} as { [id: string]: number });
  const protosToDisplay = protosByAccountId[activeAccount?.id];
  if (!accountsWithData.length) {
    return <></>;
  }
  return (
    <div className="divide-y divide-gray-200 rounded border border-gray-200">
      <div className="flex gap-2 p-2">
        {accountsWithData.map((account) => (
          <ButtonLink
            key={account.id}
            onClick={() => setActiveAccount(account)}
            disabled={account.id == activeAccount.id}
          >
            {account.bank.name}: {account.name} (
            {protosByAccountId[account.id].length})
          </ButtonLink>
        ))}
      </div>
      <ul className="divide-y divide-gray-200">
        {protosToDisplay
          .slice(0, limit[activeAccount.id] ?? 10)
          .map((proto) => (
            <li key={proto.openBankingTransactionId} className="p-2">
              <div className="flex">
                <div
                  className="grow cursor-pointer"
                  onClick={() => props.onItemClick(proto)}
                >
                  {proto.amount} {proto.vendor}{" "}
                  {shortRelativeDate(proto.timestamp)}
                </div>
                <div>
                  <ButtonLink
                    onClick={() =>
                      setExpanded((prev) =>
                        Object.assign({}, prev, {
                          [proto.openBankingTransactionId]:
                            !prev[proto.openBankingTransactionId],
                        })
                      )
                    }
                  >
                    Raw
                  </ButtonLink>
                </div>
              </div>
              {expanded[proto.openBankingTransactionId] && (
                <pre className="text-xs">{JSON.stringify(proto, null, 2)}</pre>
              )}
            </li>
          ))}
        <li className="p-2">
          <ButtonLink
            onClick={() =>
              setLimit((prev) =>
                Object.assign({}, prev, {
                  [activeAccount.id]: (prev[activeAccount.id] ?? 10) + 10,
                })
              )
            }
          >
            More
          </ButtonLink>
        </li>
      </ul>
    </div>
  );
};

export const AddTransactionForm = (props: {
  banks: Bank[];
  categories: Category[];
  transaction?: Transaction;
  allTransactions: Transaction[];
  openBankingTransactions?: IOBTransactionsByAccountId;
  transactionPrototypes?: DBTransactionPrototype[];
  onAdded: (added: DBTransaction) => void;
  onClose: () => void;
}) => {
  const [apiError, setApiError] = useState("");
  const [mode, setMode] = useState(formModeForTransaction(props.transaction));
  const [isAdvancedMode, setAdvancedMode] = useState(false);
  const [prototype, setPrototype] = useState<TransactionPrototype>(null);
  const currencies = useCurrencyContext();

  const submitNewTransaction = async (
    values: AddTransactionFormValues,
    { setSubmitting }: FormikHelpers<AddTransactionFormValues>
  ) => {
    try {
      const body = JSON.stringify(formToDTO(mode, values, props.transaction));
      const added = await fetch("/api/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body,
      });
      setSubmitting(false);
      props.onAdded(await added.json());
    } catch (error) {
      setSubmitting(false);
      console.log(error);
      setApiError(`Failed to add: ${error}`);
    }
  };

  const creatingNewTransaction = !props.transaction;
  const defaultAccountFrom = mostUsedAccountFrom(mode, props.allTransactions);
  const defaultAccountTo = mostUsedAccountTo(mode, props.allTransactions);
  const defaultCategory = props.categories[0];
  const defaultCurrency = currencies.all()[0];
  const initialValues = !props.transaction
    ? initialValuesEmpty(
        defaultAccountFrom,
        defaultAccountTo,
        defaultCategory,
        defaultCurrency
      )
    : initialValuesForTransaction(
        props.transaction,
        defaultAccountFrom,
        defaultAccountTo
      );

  return (
    <div>
      <Formik initialValues={initialValues} onSubmit={submitNewTransaction}>
        {({ isSubmitting }) => (
          <div className="overflow-hidden shadow sm:rounded-md">
            <div className="bg-white p-2 sm:p-6">
              <div className="mb-2">
                <NewTransactionSuggestions
                  openBankingTransactions={props.openBankingTransactions}
                  transactionPrototypes={props.transactionPrototypes}
                  banks={props.banks}
                  allTransactions={props.allTransactions}
                  onItemClick={(t) => setPrototype(t)}
                />
              </div>

              <FormTransactionTypeSelector
                disabled={isSubmitting}
                mode={mode}
                setMode={(m) => setMode(m)}
              >
                <FormInputs
                  transaction={props.transaction}
                  prototype={prototype}
                  allTransactions={props.allTransactions}
                  categories={props.categories}
                  isAdvancedMode={isAdvancedMode}
                  banks={props.banks}
                  mode={mode}
                />
              </FormTransactionTypeSelector>
            </div>

            <div className="flex justify-end gap-2 bg-gray-50 px-4 py-3 sm:px-6">
              {apiError && (
                <div className="grow text-left text-red-700">{apiError}</div>
              )}

              <ButtonFormSecondary
                className="self-start"
                onClick={() => setAdvancedMode(!isAdvancedMode)}
                disabled={isSubmitting}
                label="Advanced"
              />

              <ButtonFormSecondary
                className="self-start"
                onClick={props.onClose}
                disabled={isSubmitting}
                label="Cancel"
              />

              <ButtonFormPrimary
                className="self-start"
                disabled={isSubmitting}
                label={
                  creatingNewTransaction
                    ? isSubmitting
                      ? "Adding…"
                      : "Add"
                    : isSubmitting
                    ? "Updating…"
                    : "Update"
                }
              />
            </div>
          </div>
        )}
      </Formik>
    </div>
  );
};

const FormInputs = (props: {
  transaction: Transaction;
  allTransactions: Transaction[];
  categories: Category[];
  isAdvancedMode: boolean;
  banks: Bank[];
  mode: FormMode;
  prototype: TransactionPrototype;
}) => {
  const currencies = useCurrencyContext();
  const {
    values: { amount, vendor, timestamp, isFamilyExpense },
    touched,
    setFieldValue,
    handleChange,
    dirty,
  } = useFormikContext<AddTransactionFormValues>();

  useEffect(() => {
    setFieldValue("ownShareAmount", isFamilyExpense ? amount / 2 : amount);
  }, [amount, dirty, isFamilyExpense, setFieldValue]);

  useEffect(() => {
    setFieldValue("receivedAmount", amount);
  }, [amount, dirty, setFieldValue]);

  useEffect(() => {
    if (!props.transaction && !touched["fromBankAccountId"]) {
      setFieldValue(
        "fromBankAccountId",
        mostUsedAccountFrom(props.mode, props.allTransactions).id
      );
    }
    if (!props.transaction && !touched["toBankAccountId"]) {
      setFieldValue(
        "toBankAccountId",
        mostUsedAccountTo(props.mode, props.allTransactions).id
      );
    }
  }, [
    props.allTransactions,
    props.mode,
    props.transaction,
    setFieldValue,
    touched,
  ]);

  useEffect(() => {
    const suggestion = mostUsedCategory(
      props.mode,
      props.allTransactions,
      vendor
    );
    if (suggestion) {
      setFieldValue("categoryId", suggestion.id);
    }
  }, [
    dirty,
    props.allTransactions,
    props.mode,
    setFieldValue,
    touched,
    vendor,
  ]);

  const vendorFrequency: { [vendor: string]: number } = {};
  props.allTransactions
    .filter((x) => {
      switch (props.mode) {
        case FormMode.PERSONAL:
          return x.isPersonalExpense();
        case FormMode.INCOME:
          return x.isIncome();
        case FormMode.EXTERNAL:
          return x.isThirdPartyExpense();
        default:
          return false;
      }
    })
    .map((x) => x.vendor())
    .forEach((x) => (vendorFrequency[x] = (vendorFrequency[x] ?? 0) + 1));
  const vendors = Object.entries(vendorFrequency)
    .filter((x) => x[1] > 1)
    .sort((a, b) => b[1] - a[1])
    .map((x) => x[0]);

  return (
    <>
      <InputRow>
        <MoneyInputWithLabel name="amount" label="Amount" />
      </InputRow>

      <InputRow
        mode={props.mode}
        modes={
          props.isAdvancedMode
            ? [FormMode.PERSONAL, FormMode.EXTERNAL, FormMode.INCOME]
            : []
        }
      >
        <MoneyInputWithLabel name="ownShareAmount" label="Own share amount" />
      </InputRow>

      <InputRow
        mode={props.mode}
        modes={[FormMode.PERSONAL, FormMode.EXTERNAL, FormMode.INCOME]}
      >
        <Switch.Group>
          <div className="flex items-center">
            <div className="flex">
              <Switch
                checked={isFamilyExpense}
                onChange={() => {
                  setFieldValue("isFamilyExpense", !isFamilyExpense);
                }}
                className={`${
                  isFamilyExpense ? "bg-indigo-700" : "bg-gray-200"
                } relative inline-flex h-6 w-11 items-center rounded-full`}
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
      </InputRow>

      <InputRow
        mode={props.mode}
        modes={props.isAdvancedMode ? [FormMode.TRANSFER] : []}
      >
        <MoneyInputWithLabel name="receivedAmount" label="Received" />
      </InputRow>

      {/* TODO: verify that datetime-local is processed correctly with regards to timezones */}
      <InputRow mode={props.mode}>
        <label
          htmlFor="timestamp"
          className="block text-sm font-medium text-gray-700"
        >
          Time
        </label>
        <input
          type="datetime-local"
          name="timestamp"
          id="timestamp"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          value={timestamp}
          onChange={handleChange}
        />
      </InputRow>

      <InputRow
        mode={props.mode}
        modes={[FormMode.PERSONAL, FormMode.EXTERNAL, FormMode.INCOME]}
      >
        <TextInputWithLabel name="vendor" label="Vendor" list="vendors" />
        <datalist id="vendors">
          {vendors.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
      </InputRow>

      <InputRow
        mode={props.mode}
        modes={
          props.isAdvancedMode
            ? [FormMode.PERSONAL, FormMode.EXTERNAL]
            : [FormMode.TRANSFER]
        }
      >
        <TextInputWithLabel name="description" label="Description" />
      </InputRow>

      <InputRow mode={props.mode}>
        <SelectNumber name="categoryId" label="Category">
          {props.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nameWithAncestors}
            </option>
          ))}
        </SelectNumber>
      </InputRow>

      <InputRow mode={props.mode} modes={[FormMode.EXTERNAL]}>
        <TextInputWithLabel name="payer" label="Payer" />
      </InputRow>

      <InputRow
        mode={props.mode}
        modes={[FormMode.TRANSFER, FormMode.PERSONAL]}
      >
        <BankAccountSelect
          name="fromBankAccountId"
          label="Account From"
          banks={props.banks}
        />
      </InputRow>

      <InputRow mode={props.mode} modes={[FormMode.TRANSFER, FormMode.INCOME]}>
        <BankAccountSelect
          name="toBankAccountId"
          label="Account To"
          banks={props.banks}
        />
      </InputRow>

      <InputRow mode={props.mode} modes={[FormMode.EXTERNAL]}>
        <SelectNumber name="currencyId" label="Currency">
          {currencies.all().map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectNumber>
      </InputRow>
    </>
  );
};
