import { BankAccount as DBBankAccount } from "@prisma/client";
import { Currencies } from "lib/ClientSideModel";
import { Bank, BankAccount } from "lib/model/BankAccount";
import React, { useState } from "react";

type BankAccountListItemProps = {
  bank: Bank;
  account: BankAccount;
  currencies: Currencies;
  onUpdated: (updated: DBBankAccount) => void;
};

const BankAccountListItem: React.FC<BankAccountListItemProps> = (props) => {
  const [name, setName] = useState(props.account.name);
  const [displayOrder, setDisplayOrder] = useState(props.account.displayOrder);
  const [currencyId, setCurrencyId] = useState(props.account.currency.id);
  const [formDisplayed, setFormDisplayed] = useState(false);
  const [apiError, setApiError] = useState("");
  const [requestInFlight, setRequestInFlight] = useState(false);

  const reset = () => {
    setName(props.account.name);
    setDisplayOrder(props.account.displayOrder);
    setCurrencyId(props.account.currency.id);
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
        displayOrder,
        currencyId,
        bankId: props.bank.id,
      };
      const response = await fetch(
        `/api/config/bank-account/${props.account.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      close();
      const responseJson = await response.json();
      props.onUpdated(responseJson);
    } catch (error) {
      setApiError(`Failed to update: ${error}`);
    }
    setRequestInFlight(false);
  };

  if (!formDisplayed) {
    return (
      <div>
        <span className="text-lg">{props.account.name}</span>;
        <small className="py-4 text-xs">
          displayOrder {props.account.displayOrder}
        </small>
        <button onClick={open}>Edit</button>
      </div>
    );
  }
  return (
    <form onSubmit={handleSubmit}>
      <input
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        type="text"
        disabled={requestInFlight}
        value={name}
      />
      <input
        onChange={(e) => setDisplayOrder(+e.target.value)}
        placeholder="Display order"
        type="number"
        disabled={requestInFlight}
        value={displayOrder}
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
        value={requestInFlight ? "Updating…" : "Update"}
      />
      {apiError && <span>{apiError}</span>}
    </form>
  );
};

export default BankAccountListItem;
