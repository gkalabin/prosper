import { Currency as DBCurrency } from "@prisma/client";
import Layout from "components/Layout";
import { updateState } from "lib/stateHelpers";
import { DB } from "lib/db";
import { Currencies, Currency } from "lib/model/Currency";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "pages/api/auth/[...nextauth]";
import React, { useState } from "react";

type CurrenciesListProps = {
  currencies: Currencies;
  onUpdated: (updated: DBCurrency) => void;
};
const CurrenciesList: React.FC<CurrenciesListProps> = (props) => {
  if (props.currencies.empty()) {
    return <div>No currencies found.</div>;
  }
  return (
    <div className="space-y-1 px-4">
      {props.currencies.all().map((x) => (
        <div key={x.id}>
          <CurrencyName currency={x} onUpdated={props.onUpdated} />
        </div>
      ))}
    </div>
  );
};

const AddCurrencyForm = (props: { onAdded: (added: DBCurrency) => void }) => {
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

const CurrencyName = (props: {
  currency: Currency;
  onUpdated: (updated: DBCurrency) => void;
}) => {
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
        <button className="mx-4 rounded-sm bg-orange-200 px-4" onClick={open}>
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

export const getServerSideProps: GetServerSideProps<{
  data?: {
    dbCurrencies: DBCurrency[];
  };
}> = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) {
    return { props: {} };
  }
  const userId = +session.user.id;
  const db = new DB({ userId });
  const c = await db.currencyFindMany();
  return {
    props: {
      data: {
        dbCurrencies: JSON.parse(JSON.stringify(c)),
      },
    },
  };
};

export default function CurrenciesPage(
  props: InferGetServerSidePropsType<typeof getServerSideProps>
) {
  const [dbCurrencies, setDbCurrencies] = useState(props.data?.dbCurrencies);
  const currencies = new Currencies(dbCurrencies);

  return (
    <Layout>
      <CurrenciesList
        currencies={currencies}
        onUpdated={updateState(setDbCurrencies)}
      />
      <AddCurrencyForm onAdded={updateState(setDbCurrencies)} />
    </Layout>
  );
}
