import { GetStaticProps } from "next";
import React, { useState } from "react";
import Layout from "../../components/Layout";
import Currency from "../../lib/model/Currency";
import prisma from "../../lib/prisma";

export const getStaticProps: GetStaticProps = async () => {
  const currencies = await prisma.currency.findMany({});

  return {
    props: JSON.parse(
      JSON.stringify({
        currencies,
      })
    ),
  };
};

type CurrenciesListProps = {
  currencies: Currency[];
  onUpdated: (updated: Currency) => void;
};
const CurrenciesList: React.FC<CurrenciesListProps> = (props) => {
  if (!props.currencies?.length) {
    return <div>No currencies found.</div>;
  }
  return (
    <div className="space-y-1 px-4">
      {props.currencies.map((x) => (
        <div key={x.id}>
          <CurrencyName currency={x} onUpdated={props.onUpdated} />
        </div>
      ))}
    </div>
  );
};
type AddCurrencyFormProps = {
  onAdded: (added: Currency) => void;
};

const AddCurrencyForm: React.FC<AddCurrencyFormProps> = (props) => {
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
      const added = await fetch("/api/config/currency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
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
    return <button onClick={open}>New Currency</button>;
  }
  return (
    <form onSubmit={handleSubmit}>
      <h3>New Currency</h3>
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

type CurrencyNameProps = {
  currency: Currency;
  onUpdated: (updated: Currency) => void;
};

const CurrencyName: React.FC<CurrencyNameProps> = (props) => {
  const [name, setName] = useState(props.currency.name);
  const [formDisplayed, setFormDisplayed] = useState(false);
  const [apiError, setApiError] = useState("");
  const [requestInFlight, setRequestInFlight] = useState(false);

  const reset = () => {
    setName(props.currency.name);
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
      const response = await fetch(
        `/api/config/currency/${props.currency.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
          }),
        }
      );
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
        <span className="text-lg">{props.currency.name}</span>
        <button className="mx-4 px-4 bg-orange-200 rounded-sm" onClick={open}>
          Edit
        </button>
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

type PageProps = {
  currencies: Currency[];
};
const CurrenciesPage: React.FC<PageProps> = (props) => {
  const [currencies, setCurrencies] = useState(props.currencies);

  const addCurrency = (added: Currency) => {
    setCurrencies((old) => [...old, added]);
  };
  const updateCurrency = (updated: Currency) => {
    setCurrencies((old) => old.map((x) => (x.id == updated.id ? updated : x)));
  };

  return (
    <Layout>
      <CurrenciesList currencies={currencies} onUpdated={updateCurrency} />
      <AddCurrencyForm onAdded={addCurrency} />
    </Layout>
  );
};

export default CurrenciesPage;
