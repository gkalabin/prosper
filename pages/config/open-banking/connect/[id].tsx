import {
  Bank as DBBank,
  BankAccount as DBBankAccount,
  Currency as DBCurrency
} from "@prisma/client";
import { Select } from "components/forms/Select";
import Layout from "components/Layout";
import { ButtonFormPrimary } from "components/ui/buttons";
import {
  banksModelFromDatabaseData,
  currencyModelFromDatabaseData
} from "lib/ClientSideModel";
import prisma from "lib/prisma";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { useState } from "react";

interface OpenBankingAccount {
  account_id: string;
  display_name: string;
  currency: string;
  provider_display_name: string;
  provider_id: string;
}

export const getServerSideProps: GetServerSideProps<{
  dbBanks: DBBank[];
  dbBankAccounts: DBBankAccount[];
  dbCurrencies: DBCurrency[];
  dbOpenBankingAccounts: OpenBankingAccount[];
}> = async ({ params }) => {
  const banks = await prisma.bank.findMany();
  const bankAccounts = await prisma.bankAccount.findMany();
  const currencies = await prisma.currency.findMany();
  const token = await prisma.openBankingToken.findFirst({
    where: {
      id: params.id as string,
    },
    select: {
      access_token: true,
    },
  });

  const accounts = await fetch(`https://api.truelayer.com/data/v1/accounts`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const accountsJson = await accounts.json();
  console.log("accounts response is ", JSON.stringify(accountsJson, null, 2));
  const openBankingAccounts = accountsJson.results.map((x) => {
    return {
      account_id: x.account_id,
      display_name: x.display_name,
      currency: x.currency,
      provider_display_name: x.provider.display_name,
      provider_id: x.provider.provider_id,
    };
  });

  return {
    props: {
      dbBanks: JSON.parse(JSON.stringify(banks)),
      dbBankAccounts: JSON.parse(JSON.stringify(bankAccounts)),
      dbCurrencies: JSON.parse(JSON.stringify(currencies)),
      dbOpenBankingAccounts: JSON.parse(JSON.stringify(openBankingAccounts)),
    },
  };
};

export default function ConnectBanksPage({
  dbBanks,
  dbBankAccounts,
  dbCurrencies,
  dbOpenBankingAccounts,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [banks] = banksModelFromDatabaseData(
    dbBanks,
    dbBankAccounts,
    dbCurrencies
  );
  const currencies = currencyModelFromDatabaseData(dbCurrencies);
  const [requestInFlight, setRequestInFlight] = useState(false);
  const [apiError, setApiError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [mapping, setMapping] = useState(
    Object.fromEntries(dbOpenBankingAccounts.map((a) => [a.account_id, -1]))
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");
    setRequestInFlight(true);
    try {
      await fetch("/api/config/open-banking/bank-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mapping),
      });
      setStatusMessage("Success!");
    } catch (error) {
      setApiError(`Failed to add: ${error}`);
    }
    setRequestInFlight(false);
  };

  return (
    <Layout>
      {dbOpenBankingAccounts.map((oba) => (
        <>
          <div key={oba.account_id}>
            {oba.provider_display_name} {oba.display_name} ({oba.currency})
            connected with
            <Select
              value={mapping[oba.account_id]}
              onChange={(e) =>
                setMapping((old) =>
                  Object.assign({}, old, { [oba.account_id]: e.target.value })
                )
              }
            >
              <option value="-1">None</option>
              {banks.map((b) =>
                b.accounts.map((ba) => (
                  <option key={ba.id} value={ba.id}>
                    {b.name} {ba.name}
                  </option>
                ))
              )}
            </Select>
          </div>
        </>
      ))}
      <ButtonFormPrimary onClick={handleSubmit} label="Save" />
    </Layout>
  );
}
