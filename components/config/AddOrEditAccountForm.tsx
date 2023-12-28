import { BankAccount as DBBankAccount } from "@prisma/client";
import { FormikInput, FormikMoneyInput } from "components/forms/Input";
import { undoTailwindInputStyles } from "components/forms/Select";
import {
  AddOrUpdateButtonText,
  ButtonFormPrimary,
  ButtonFormSecondary,
} from "components/ui/buttons";
import { Form, Formik, useFormikContext } from "formik";
import { useDisplayCurrency } from "lib/displaySettings";
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
  bankAccounts,
  stocks,
  onAddedOrUpdated,
  onClose,
}: {
  bankAccount?: BankAccount;
  bankAccounts: BankAccount[];
  bank: Bank;
  stocks: Stock[];
  onAddedOrUpdated: (x: DBBankAccount) => void;
  onClose: () => void;
}) => {
  const [apiError, setApiError] = useState("");
  const addingNewAccount = !bankAccount;
  const initialValues = useInitialFormValues(
    bank,
    bankAccounts,
    stocks,
    bankAccount,
  );

  const handleSubmit = async (values: BankAccountApiModel) => {
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
        },
      );
      if (!added.ok) {
        setApiError(
          `Failed to add: ${await added.text()} (code ${added.status})`,
        );
        return;
      }
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
          <div>
            {apiError && (
              <div className="font-medium text-red-500">{apiError}</div>
            )}
          </div>
          <div className="flex flex-row justify-end gap-2">
            <ButtonFormSecondary onClick={onClose} disabled={isSubmitting}>
              Cancel
            </ButtonFormSecondary>
            <ButtonFormPrimary disabled={!values.name} type="submit">
              <AddOrUpdateButtonText add={!bankAccount} />
            </ButtonFormPrimary>
          </div>
        </Form>
      )}
    </Formik>
  );
};

function useDefaultUnitValue(): UnitApiModel {
  const displayCurrency = useDisplayCurrency();
  return { kind: "currency", currencyCode: displayCurrency.code() };
}

function useInitialFormValues(
  bank: Bank,
  bankAccounts: BankAccount[],
  stocks: Stock[],
  bankAccount?: BankAccount,
): BankAccountApiModel {
  const defaultUnit = useDefaultUnitValue();
  if (!bankAccount) {
    return {
      name: "",
      unit: defaultUnit,
      isJoint: false,
      isArchived: false,
      initialBalance: 0,
      displayOrder:
        100 * bankAccounts.filter((a) => a.bankId == bank.id).length,
    };
  }

  let unit: UnitApiModel;
  if (bankAccount.stockId) {
    const stock = stocks.find((s) => s.id === bankAccount.stockId);
    if (!stock) {
      throw new Error(
        `BankAccount ${bankAccount.id} has stockId ${bankAccount.stockId} but it does not exist`,
      );
    }
    unit = {
      kind: "stock",
      ticker: stock.ticker,
      exchange: stock.exchange,
      name: stock.name,
    };
  } else if (bankAccount.currencyCode) {
    unit = {
      kind: "currency",
      currencyCode: Currency.mustFindByCode(bankAccount.currencyCode).code(),
    };
  } else {
    throw new Error(
      `BankAccount ${bankAccount.id} does not have a stock or currency`,
    );
  }
  return {
    name: bankAccount.name,
    unit,
    isJoint: bankAccount.joint,
    isArchived: bankAccount.archived,
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
  const initialStocks = stocks.map(
    (s): StockApiModel => ({
      kind: "stock",
      ticker: s.ticker,
      exchange: s.exchange,
      name: s.name,
    }),
  );
  const initialOptions = [...currencies, ...initialStocks].map(unitToOption);
  // Debounce the loadOptions function to avoid spamming the API.
  const [loadOptionsDebounced, setLoadOptionsDebounced] = useState(
    {} as { cb: () => void; delayMilliseconds: number },
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
    callback: (opts: UnitSelectOption[]) => void,
  ) => {
    setLoadOptionsDebounced({
      cb: async () => {
        const newOptions: UnitApiModel[] = currencies.filter((c) =>
          c.currencyCode.toLowerCase().includes(inputValue.toLowerCase()),
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
  const defaultValue = useDefaultUnitValue();

  return (
    <>
      <Async
        styles={undoTailwindInputStyles()}
        loadOptions={loadOptions}
        defaultOptions={initialOptions}
        value={unitToOption(unit)}
        onChange={(newValue) =>
          setFieldValue("unit", newValue?.value ?? defaultValue)
        }
        isDisabled={isSubmitting}
        isClearable={false}
      />
      {loadingError && (
        <div className="font-medium text-red-500">{loadingError}</div>
      )}
    </>
  );
}
