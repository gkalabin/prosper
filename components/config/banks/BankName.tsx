import { Bank as DBBank } from "@prisma/client";
import { Input } from "components/forms/Input";
import {
  ButtonFormPrimary,
  ButtonFormSecondary,
  ButtonLink,
} from "components/ui/buttons";
import { Bank } from "lib/model/BankAccount";
import React, { useState } from "react";

type BankNameProps = {
  bank: Bank;
  onUpdated: (bank: DBBank) => void;
};

const BankName: React.FC<BankNameProps> = (props) => {
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
      props.onUpdated(await response.json());
      close();
    } catch (error) {
      setApiError(`Failed to update: ${error}`);
    }
    setRequestInFlight(false);
  };

  if (!formDisplayed) {
    return (
      <div className="border-b bg-indigo-200 p-2 text-gray-900">
        <h1 className="inline-block text-xl font-medium">{props.bank.name}</h1>
        <small
          className="px-1 text-xs text-gray-500"
          title="Lower order items show first."
        >
          order {props.bank.displayOrder}
        </small>
        <ButtonLink className="text-sm" onClick={open} label="Edit" />
      </div>
    );
  }
  return (
    <form onSubmit={handleSubmit} className="flex gap-1 p-2">
      <Input
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        type="text"
        disabled={requestInFlight}
        value={name}
      />
      <Input
        onChange={(e) => setDisplayOrder(+e.target.value)}
        placeholder="Display order"
        type="number"
        disabled={requestInFlight}
        value={displayOrder}
      />
      <ButtonFormSecondary
        onClick={close}
        disabled={requestInFlight}
        label="Cancel"
      />
      <ButtonFormPrimary
        disabled={!name || requestInFlight}
        label={requestInFlight ? "Updating…" : "Update"}
      />

      {apiError && <span className="text-red-500">{apiError}</span>}
    </form>
  );
};

export default BankName;
