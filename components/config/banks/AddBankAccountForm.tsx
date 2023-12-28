import { BankAccount as DBBankAccount } from "@prisma/client";
import { Currencies } from "lib/model/Currency";
import { Bank } from "lib/model/BankAccount";
import Link from "next/link";
import React, { useState } from "react";

const AddBankAccountForm = (props: {
  displayOrder: number;
  bank: Bank;
  currencies: Currencies;
  onAdded: (added: DBBankAccount) => void;
}) => {
  const [name, setName] = useState("");
  const [currencyId, setCurrencyId] = useState(props.currencies.all()[0]?.id);
  const [formDisplayed, setFormDisplayed] = useState(false);
  const [requestInFlight, setRequestInFlight] = useState(false);
  const [apiError, setApiError] = useState("");

  const reset = () => {
    setName("");
    setCurrencyId(props.currencies.all()[0]?.id);
    setApiError("");
  };

  const open = () => {
    reset();
    setFormDisplayed(true);
  };

  const close = () => {
    reset();
    setFormDisplayed(false);
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setApiError("");
    setRequestInFlight(true);
    try {
      const body = {
        name,
        currencyId,
        displayOrder: props.displayOrder,
        bankId: props.bank.id,
      };
      const added = await fetch("/api/config/bank-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      close();
      props.onAdded(await added.json());
    } catch (error) {
      setApiError(`Failed to add: ${error}`);
    }
    setRequestInFlight(false);
  };

  if (!props.currencies.all().length) {
    return (
      <>
        To add a bank account, first{" "}
        <Link href="/config/currencies">
          <a>add a currency.</a>
        </Link>
      </>
    );
  }
  if (!formDisplayed) {
    return <button onClick={open}>New Bank Account</button>;
  }
  return (
    <form onSubmit={handleSubmit}>
      <input
        autoFocus
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        disabled={requestInFlight}
        type="text"
        value={name}
      />
      <select
        onChange={(e) => setCurrencyId(+e.target.value)}
        disabled={requestInFlight}
        value={currencyId}
      >
        {props.currencies.all().map((x) => (
          <option key={x.id} value={x.id}>
            {x.name}
          </option>
        ))}
      </select>
      <button onClick={close} disabled={requestInFlight}>
        Cancel
      </button>
      <input
        disabled={!name || requestInFlight}
        type="submit"
        value={requestInFlight ? "Adding…" : "Add"}
      />
      {apiError && <span>{apiError}</span>}
    </form>
  );
};

export default AddBankAccountForm;
