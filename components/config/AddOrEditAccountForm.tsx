import { BankAccount as DBBankAccount } from "@prisma/client";
import { FormikInput, FormikMoneyInput } from "components/forms/Input";
import { undoTailwindInputStyles } from "components/forms/Select";
import {
  AddOrUpdateButtonText,
  ButtonFormPrimary,
  ButtonFormSecondary,
} from "components/ui/buttons";
import { Form, Formik, useFormikContext } from "formik";
import {
  BankAccountApiModel,
  CurrencyApiModel,
  StockApiModel,
  UnitApiModel,
} from "lib/model/api/BankAccountForm";
import { Bank, BankAccount } from "lib/model/BankAccount";
import { Currency } from "lib/model/Currency";
import { Stock } from "lib/model/Stock";
import { useEffect, useState } from "react";
import Async from "react-select/async";

export const AddOrEditAccountForm = ({
  bank,
  bankAccount,
  stocks,
  onAddedOrUpdated,
  onClose,
}: {
  bankAccount?: BankAccount;
  bank: Bank;
  stocks: Stock[];
  onAddedOrUpdated: (x: DBBankAccount) => void;
  onClose: () => void;
}) => {
  const [apiError, setApiError] = useState("");
  const addingNewAccount = !bankAccount;
  const initialValues = formValues(bank, bankAccount);

  const handleSubmit = async (values) => {
    setApiError("");
    try {
      const body = {
        ...values,
        bankId: bank.id,
      };
      const added = await fetch(
        `/api/config/bank-account/${addingNewAccount ? "" : bankAccount.id}`,
        {
          method: addingNewAccount ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      onAddedOrUpdated(await added.json());
    } catch (error) {
      setApiError(`Failed to add: ${error}`);
    }
  };

  return (
    <Formik initialValues={initialValues} onSubmit={handleSubmit}>
      {({ isSubmitting, values }) => (
        <Form className="flex max-w-xs flex-col gap-2 px-4 pb-6 pt-2">
          <h3 className="mb-2 text-xl font-medium leading-5">
            {addingNewAccount
              ? "Add New Bank Account"
              : `Edit ${bankAccount.name}`}
          </h3>
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Account Name
            </label>
            <FormikInput autoFocus name="name" className="w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Account currency or stock
            </label>
            <UnitSelect stocks={stocks} />
          </div>
          <div>
            <label
              htmlFor="initialBalance"
              className="block text-sm font-medium text-gray-700"
            >
              Initial balance
            </label>
            <FormikMoneyInput name="initialBalance" className="w-full" />
          </div>
          <div className="flex flex-row items-center gap-3">
            <label
              htmlFor="isJoint"
              className="text-sm font-medium text-gray-700"
            >
              Joint
            </label>
            <FormikInput name="isJoint" type="checkbox" />
          </div>
          <div className="flex flex-row items-center gap-3">
            <label
              htmlFor="isArchived"
              className="text-sm font-medium text-gray-700"
            >
              Archived
            </label>
            <FormikInput name="isArchived" type="checkbox" />
          </div>
          <div className="flex flex-row justify-end gap-2">
            <ButtonFormSecondary onClick={onClose} disabled={isSubmitting}>
              Cancel
            </ButtonFormSecondary>
            <ButtonFormPrimary disabled={!values.name} type="submit">
              <AddOrUpdateButtonText add={!bankAccount} />
            </ButtonFormPrimary>
          </div>

          <div>
            {apiError && (
              <div className="font-medium text-red-500">{apiError}</div>
            )}
          </div>
        </Form>
      )}
    </Formik>
  );
};

function formValues(
  bank: Bank,
  bankAccount?: BankAccount
): BankAccountApiModel {
  if (!bankAccount) {
    return {
      name: "",
      unit: { kind: "currency", currencyCode: Currency.USD.code() },
      isJoint: false,
      isArchived: false,
      initialBalance: 0,
      displayOrder: 100 * bank.accounts.length,
    };
  }

  let unit: UnitApiModel;
  if (bankAccount.hasStock()) {
    unit = {
      kind: "stock",
      ticker: bankAccount.stock().ticker(),
      exchange: bankAccount.stock().exchange(),
      name: bankAccount.stock().name(),
    };
  } else if (bankAccount.hasCurrency()) {
    unit = {
      kind: "currency",
      currencyCode: bankAccount.currency().code(),
    };
  } else {
    throw new Error(
      `BankAccount ${bankAccount.id} does not have a stock or currency`
    );
  }
  return {
    name: bankAccount.name,
    unit,
    isJoint: bankAccount.isJoint(),
    isArchived: bankAccount.isArchived(),
    initialBalance: bankAccount.initialBalanceCents / 100,
    displayOrder: bankAccount.displayOrder,
  };
}
type UnitSelectOption = {
  value: UnitApiModel;
  label: string;
};

function labelFor(unit: UnitApiModel) {
  if (unit.kind === "currency") {
    return unit.currencyCode;
  } else if (unit.kind === "stock") {
    return `${unit.name} (${unit.ticker})`;
  } else {
    return "Unknown";
  }
}

function unitToOption(u: UnitApiModel): UnitSelectOption {
  return {
    label: labelFor(u),
    value: u,
  };
}

export function UnitSelect({ stocks }: { stocks: Stock[] }) {
  const {
    values: { unit },
    isSubmitting,
    setFieldValue,
  } = useFormikContext<BankAccountApiModel>();
  const currencies: CurrencyApiModel[] = Currency.all().map((x) => ({
    kind: "currency",
    currencyCode: x.code(),
  }));
  const initialStocks = stocks.map((s) => ({
    kind: "stock",
    ticker: s.ticker(),
    exchange: s.exchange(),
    name: s.name(),
  }));
  const initialOptions = [...currencies, ...initialStocks].map(unitToOption);
  // Debounce the loadOptions function to avoid spamming the API.
  const [loadOptionsDebounced, setLoadOptionsDebounced] = useState(
    {} as { cb: () => void; delayMilliseconds: number }
  );
  const [loadingError, setLoadingError] = useState("");
  // Listen to changes of debounce (function, delay), when it does clear the previos timeout and set the new one.
  useEffect(() => {
    const { cb, delayMilliseconds } = loadOptionsDebounced;
    if (cb) {
      const timeout = setTimeout(cb, delayMilliseconds);
      return () => clearTimeout(timeout);
    }
  }, [loadOptionsDebounced]);
  const loadOptions = (
    inputValue: string,
    callback: (opts: UnitSelectOption[]) => void
  ) => {
    setLoadOptionsDebounced({
      cb: async () => {
        const newOptions: UnitApiModel[] = currencies.filter((c) =>
          c.currencyCode.toLowerCase().includes(inputValue.toLowerCase())
        );
        try {
          const r = await fetch(`/api/stock?q=${inputValue}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });
          const stocks: StockApiModel[] = await r.json();
          newOptions.push(...stocks);
        } catch (error) {
          setLoadingError(`Failed to load stocks: ${error}`);
        }
        callback(newOptions.map(unitToOption));
      },
      delayMilliseconds: 1000,
    });
  };

  return (
    <>
      <Async
        styles={undoTailwindInputStyles()}
        loadOptions={loadOptions}
        defaultOptions={initialOptions}
        value={unitToOption(unit)}
        onChange={(newValue) => setFieldValue("unit", newValue.value)}
        isDisabled={isSubmitting}
      />
      {loadingError && (
        <div className="font-medium text-red-500">{loadingError}</div>
      )}
    </>
  );
}
