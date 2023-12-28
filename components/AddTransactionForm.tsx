import React, { useState } from "react";
import Bank from "../lib/model/Bank";
import Category from "../lib/model/Category";
import Transaction from "../lib/model/Transaction";

type AddTransactionFormProps = {
  banks: Bank[];
  categories: Category[];
  onAdded: (added: Transaction) => void;
};
export const AddTransactionForm: React.FC<AddTransactionFormProps> = (
  props
) => {
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState(0);
  const [amountCents, setAmountCents] = useState(0);
  const [formDisplayed, setFormDisplayed] = useState(false);
  const [requestInFlight, setRequestInFlight] = useState(false);
  const [apiError, setApiError] = useState("");

  const reset = () => {
    setDescription("");
    setCategoryId(0);
    setAmountCents(0);
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
      const added = await fetch("/api/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          categoryId,
          amountCents,
          timestamp: Date.now(),
        }),
      });
      close();
      props.onAdded(await added.json());
    } catch (error) {
      setApiError(`Failed to add: ${error}`);
    }
    setRequestInFlight(false);
  };

  if (!formDisplayed) {
    return <button onClick={open}>New Transaction</button>;
  }
  return (
    <form onSubmit={handleSubmit}>
      <h3>New Transaction</h3>
      <input
        autoFocus
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        disabled={requestInFlight}
        type="text"
        value={description}
      />
      <input
        onChange={(e) => setAmountCents(+e.target.value * 100)}
        placeholder="Amount"
        disabled={requestInFlight}
        type="number"
        value={amountCents / 100}
      />
      <select
        onChange={(e) => setCategoryId(+e.target.value)}
        disabled={requestInFlight}
      >
        {props.categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nameWithAncestors}
          </option>
        ))}
      </select>
      <button onClick={close} disabled={requestInFlight}>
        Cancel
      </button>
      <input
        disabled={!description || requestInFlight}
        type="submit"
        value={requestInFlight ? "Adding…" : "Add"}
      />
      {apiError && <span>{apiError}</span>}
    </form>
  );
};
