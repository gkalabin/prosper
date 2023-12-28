import React, { useState } from "react";
import Bank from "../../../lib/model/Bank";

type BankNameProps = {
  bank: Bank;
  onUpdated: (bank: Bank) => void;
};

const BankName: React.FC<BankNameProps> = (
  props
) => {
  const [name, setName] = useState(props.bank.name);
  const [displayOrder, setDisplayOrder] = useState(props.bank.displayOrder);
  const [formDisplayed, setFormDisplayed] = useState(false);
  const [apiError, setApiError] = useState("");
  const [requestInFlight, setRequestInFlight] = useState(false);

  const reset = () => {
    setName(props.bank.name);
    setDisplayOrder(props.bank.displayOrder);
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
      };
      const response = await fetch(`/api/config/bank/${props.bank.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      close();
      props.onUpdated(await response.json());
    } catch (error) {
      setApiError(`Failed to update: ${error}`);
    }
    setRequestInFlight(false);
  };

  if (!formDisplayed) {
    return (
      <div>
        <span className="text-lg">{props.bank.name}</span>;
        <small className="text-xs py-4">displayOrder {props.bank.displayOrder}</small>
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

export default BankName;
