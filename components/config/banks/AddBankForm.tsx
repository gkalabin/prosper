import { Bank as DBBank } from "@prisma/client";
import React, { useState } from "react";

type AddBankFormProps = {
  displayOrder: number;
  onAdded: (added: DBBank) => void;
};

const AddBankForm: React.FC<AddBankFormProps> = (props) => {
  const [name, setName] = useState("");
  const [formDisplayed, setFormDisplayed] = useState(false);
  const [requestInFlight, setRequestInFlight] = useState(false);
  const [apiError, setApiError] = useState("");

  const reset = () => {
    setName("");
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
        displayOrder: props.displayOrder,
      };
      const added = await fetch("/api/config/bank", {
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

  if (!formDisplayed) {
    return <button onClick={open}>New Bank</button>;
  }
  return (
    <form onSubmit={handleSubmit}>
      <h3>New Bank</h3>
      <input
        autoFocus
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        disabled={requestInFlight}
        type="text"
        value={name}
      />
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

export default AddBankForm;
