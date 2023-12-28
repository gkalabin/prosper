import { Switch } from "@headlessui/react";
import {
  Transaction as DBTransaction,
  TransactionPrototype as DBTransactionPrototype,
} from "@prisma/client";
import classNames from "classnames";
import { BankAccountSelect } from "components/forms/BankAccountSelect";
import {
  Input,
  MoneyInputWithLabel,
  TextInputWithLabel,
} from "components/forms/Input";
import { SelectNumber } from "components/forms/Select";
import {
  ButtonFormPrimary,
  ButtonFormSecondary,
  ButtonLink,
} from "components/ui/buttons";
import {
  differenceInHours,
  differenceInMilliseconds,
  format,
  isAfter,
  isBefore,
} from "date-fns";
import { Form, Formik, FormikHelpers, useFormikContext } from "formik";
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
    lookupList[provided][used] = (lookupList[provided][used] ?? 0) + 1;
  }
  const lookup = {};
  for (const [obDesc, usedMappings] of Object.entries(lookupList)) {
    const [mostUsedMapping] = Object.entries(usedMappings).sort(
      (a, b) => b[1] - a[1]
    )[0];
    lookup[obDesc] = mostUsedMapping;
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
  const incomePrototypes = prototypes.filter((p) => p.amount > 0);
  for (const to of incomePrototypes) {
    const fromCandidates = prototypes
      .filter(
        (from) =>
          Math.abs(from.amount + to.amount) < 0.01 &&
          isBefore(from.timestamp, to.timestamp) &&
          differenceInHours(to.timestamp, from.timestamp) < 2 &&
          from.accountFromId != to.accountToId
      )
      // sort, so the closest to `to` transfer comes first
      .sort(
        (f1, f2) =>
          differenceInMilliseconds(to.timestamp, f1.timestamp) -
          differenceInMilliseconds(to.timestamp, f2.timestamp)
      );
    if (!fromCandidates.length) {
      continue;
    }
    const from = fromCandidates[0];
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
  const [hideBeforeLatest, setHideBeforeLatest] = useState(true);
  const [expanded, setExpanded] = useState({} as { [id: string]: boolean });
  const [limit, setLimit] = useState({} as { [id: string]: number });
  const prototypes = makePrototypes({
    allTransactions: props.allTransactions,
    openBankingTransactions: props.openBankingTransactions,
    transactionPrototypes: props.transactionPrototypes,
  });
  const protosByAccountId = new Map<number, TransactionPrototype[]>();
  prototypes.forEach((p) => {
    const append = (accountId: number) => {
      if (!accountId) {
        return;
      }
      const ps = protosByAccountId.get(accountId) ?? [];
      protosByAccountId.set(accountId, [...ps, p]);
    };
    append(p.accountFromId);
    append(p.accountToId);
  });
  const latestTxByAccountId = new Map<number, Date>();
  props.allTransactions.forEach((t) => {
    const updateIfNewer = (accountId: number) => {
      const latest = latestTxByAccountId.get(accountId);
      if (!latest || isBefore(latest, t.timestamp)) {
        latestTxByAccountId.set(accountId, t.timestamp);
      }
    };
    if (t.hasAccountFrom()) {
      updateIfNewer(t.accountFrom().id);
    }
    if (t.hasAccountTo()) {
      updateIfNewer(t.accountTo().id);
    }
  });
  let totalHidden = 0;
  if (hideBeforeLatest) {
    for (const [accountId, latest] of latestTxByAccountId.entries()) {
      const ps = protosByAccountId.get(accountId) ?? [];
      if (!ps.length) {
        continue;
      }
      const filtered = ps.filter((p) => isAfter(p.timestamp, latest));
      protosByAccountId.set(accountId, filtered);
      totalHidden += ps.length - filtered.length;
    }
  }
  const accountsWithData = props.banks
    .flatMap((x) => x.accounts)
    .filter((a) => protosByAccountId.get(a.id)?.length)
    .sort(
      (a, b) =>
        protosByAccountId.get(b.id).length - protosByAccountId.get(a.id).length
    );
  const [activeAccount, setActiveAccount] = useState(
    !accountsWithData.length ? null : accountsWithData[0]
  );
  const protosToDisplay = protosByAccountId.get(activeAccount?.id);
  useEffect(() => {
    if (!protosToDisplay?.length && accountsWithData.length) {
      setActiveAccount(accountsWithData[0]);
    }
  }, [accountsWithData, protosToDisplay, hideBeforeLatest]);
  if (!accountsWithData.length) {
    return <></>;
  }
  return (
    <div className="divide-y divide-gray-200 rounded border border-gray-200">
      <div>
        <div className="flex gap-2 p-2">
          {accountsWithData.map((account) => (
            <ButtonLink
              key={account.id}
              onClick={() => setActiveAccount(account)}
              disabled={account.id == activeAccount.id}
            >
              {account.bank.name}: {account.name} (
              {protosByAccountId.get(account.id).length})
            </ButtonLink>
          ))}
        </div>
        <div className="px-2 pb-1 text-xs text-slate-600">
          {hideBeforeLatest && (
            <span>
              Hidden {totalHidden} suggestions because there are more recent
              recorded transactions.{" "}
              <ButtonLink onClick={() => setHideBeforeLatest(false)}>
                Show them anyway.
              </ButtonLink>
            </span>
          )}
          {!hideBeforeLatest && (
            <span>
              Showing all suggestions.{" "}
              <ButtonLink onClick={() => setHideBeforeLatest(true)}>
                Hide irrelevant.
              </ButtonLink>
            </span>
          )}
        </div>
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
  const creatingNewTransaction = !props.transaction;
  const defaultAccountFrom = mostUsedAccountFrom(mode, props.allTransactions);
  const defaultAccountTo = mostUsedAccountTo(mode, props.allTransactions);
  const defaultCategory = props.categories[0];
  const defaultCurrency = currencies.all()[0];
  const initialValuesForEmptyForm = initialValuesEmpty(
    defaultAccountFrom,
    defaultAccountTo,
    defaultCategory,
    defaultCurrency
  );
  const initialValues = !props.transaction
    ? initialValuesForEmptyForm
    : initialValuesForTransaction(
        props.transaction,
        defaultAccountFrom,
        defaultAccountTo
      );

  const submitNewTransaction = async (
    values: AddTransactionFormValues,
    { setSubmitting, resetForm }: FormikHelpers<AddTransactionFormValues>
  ) => {
    const body = JSON.stringify(formToDTO(mode, values, props.transaction));
    await fetch("/api/transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body,
    })
      .then(async (added) => {
        // stop submitting before callback to avoid updating state on an unmounted component
        setSubmitting(false);
        resetForm({ values: initialValuesForEmptyForm });
        setPrototype(null);
        props.onAdded(await added.json());
      })
      .catch((error) => {
        setSubmitting(false);
        console.log(error);
        setApiError(`Failed to add: ${error}`);
      });
  };

  return (
    <div>
      <Formik initialValues={initialValues} onSubmit={submitNewTransaction}>
        {({ isSubmitting }) => (
          <Form>
            <div className="overflow-hidden shadow sm:rounded-md">
              <div className="bg-white p-2 sm:p-6">
                <div className="mb-2">
                  <NewTransactionSuggestions
                    openBankingTransactions={props.openBankingTransactions}
                    transactionPrototypes={props.transactionPrototypes}
                    banks={props.banks}
                    allTransactions={props.allTransactions}
                    onItemClick={(t) => {
                      if (isSubmitting) {
                        // The form is disabled while being submitted, so do not change it through suggestions either.
                        return;
                      }
                      setPrototype(t);
                      setMode(t.mode);
                    }}
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
                >
                  Advanced
                </ButtonFormSecondary>

                <ButtonFormSecondary
                  className="self-start"
                  onClick={props.onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </ButtonFormSecondary>

                <ButtonFormPrimary
                  className="self-start"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {creatingNewTransaction
                    ? isSubmitting
                      ? "Adding…"
                      : "Add"
                    : isSubmitting
                    ? "Updating…"
                    : "Update"}
                </ButtonFormPrimary>
              </div>
            </div>
          </Form>
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
    values: { amount, vendor, timestamp, isFamilyExpense, fromBankAccountId },
    setFieldValue,
    handleChange,
    isSubmitting,
  } = useFormikContext<AddTransactionFormValues>();

  useEffect(() => {
    setFieldValue("ownShareAmount", isFamilyExpense ? amount / 2 : amount);
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
    setFieldValue(
      "fromBankAccountId",
      mostUsedAccountFrom(props.mode, props.allTransactions).id
    );
    setFieldValue(
      "toBankAccountId",
      mostUsedAccountTo(props.mode, props.allTransactions).id
    );
  }, [
    props.allTransactions,
    props.mode,
    setFieldValue,
    props.transaction,
    props.prototype,
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
  }, [vendor, props.allTransactions, props.mode, setFieldValue]);

  useEffect(() => {
    if (props.mode == FormMode.PERSONAL) {
      const account = props.banks
        .flatMap((b) => b.accounts)
        .find((a) => a.id == fromBankAccountId);
      setFieldValue("isFamilyExpense", account.isJoint());
    }
  }, [props.mode, setFieldValue, props.banks, fromBankAccountId]);

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
        <MoneyInputWithLabel
          name="amount"
          label="Amount"
          disabled={isSubmitting}
        />
      </InputRow>

      <InputRow
        mode={props.mode}
        modes={
          props.isAdvancedMode
            ? [FormMode.PERSONAL, FormMode.EXTERNAL, FormMode.INCOME]
            : []
        }
      >
        <MoneyInputWithLabel
          name="ownShareAmount"
          label="Own share amount"
          disabled={isSubmitting}
        />
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
      </InputRow>

      <InputRow
        mode={props.mode}
        modes={props.isAdvancedMode ? [FormMode.TRANSFER] : []}
      >
        <MoneyInputWithLabel
          name="receivedAmount"
          label="Received"
          disabled={isSubmitting}
        />
      </InputRow>

      {/* TODO: verify that datetime-local is processed correctly with regards to timezones */}
      <InputRow mode={props.mode}>
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
      </InputRow>

      <InputRow
        mode={props.mode}
        modes={[FormMode.PERSONAL, FormMode.EXTERNAL, FormMode.INCOME]}
      >
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
      </InputRow>

      <InputRow
        mode={props.mode}
        modes={
          props.isAdvancedMode
            ? [FormMode.PERSONAL, FormMode.EXTERNAL]
            : [FormMode.TRANSFER]
        }
      >
        <TextInputWithLabel
          name="description"
          label="Description"
          disabled={isSubmitting}
        />
      </InputRow>

      <InputRow mode={props.mode}>
        <SelectNumber
          name="categoryId"
          label="Category"
          disabled={isSubmitting}
        >
          {props.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nameWithAncestors}
            </option>
          ))}
        </SelectNumber>
      </InputRow>

      <InputRow mode={props.mode} modes={[FormMode.EXTERNAL]}>
        <TextInputWithLabel
          name="payer"
          label="Payer"
          disabled={isSubmitting}
        />
      </InputRow>

      <InputRow
        mode={props.mode}
        modes={[FormMode.TRANSFER, FormMode.PERSONAL]}
      >
        <BankAccountSelect
          name="fromBankAccountId"
          label="Account From"
          banks={props.banks}
          disabled={isSubmitting}
        />
      </InputRow>

      <InputRow mode={props.mode} modes={[FormMode.TRANSFER, FormMode.INCOME]}>
        <BankAccountSelect
          name="toBankAccountId"
          label="Account To"
          banks={props.banks}
          disabled={isSubmitting}
        />
      </InputRow>

      <InputRow mode={props.mode} modes={[FormMode.EXTERNAL]}>
        <SelectNumber
          name="currencyId"
          label="Currency"
          disabled={isSubmitting}
        >
          {currencies.all().map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectNumber>
      </InputRow>

      <InputRow mode={props.mode} modes={props.isAdvancedMode
            ? [FormMode.PERSONAL, FormMode.EXTERNAL]
            : []}>
        <TextInputWithLabel
          name="tripId"
          label="Trip"
          disabled={isSubmitting}
        />
      </InputRow>
    </>
  );
};
