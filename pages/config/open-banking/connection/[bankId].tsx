import {
  Bank as DBBank,
  BankAccount as DBBankAccount,
  Currency as DBCurrency,
  OpenBankingAccount as DBOpenBankingAccount,
} from "@prisma/client";
import { Select } from "components/forms/Select";
import Layout from "components/Layout";
import { ButtonFormPrimary } from "components/ui/buttons";
import { banksModelFromDatabaseData, Currencies } from "lib/ClientSideModel";
import { maybeRefreshToken } from "lib/openBankingToken";
import prisma from "lib/prisma";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { AccountMappingRequest } from "pages/api/open-banking/account-mapping";
import { useState } from "react";

interface OpenBankingAccount {
  openBankingAccountId: string;
  displayName: string;
  currency: string;
  providerDisplayName: string;
  providerId: string;
}

export const getServerSideProps: GetServerSideProps<{
  bankId: number;
  dbBanks: DBBank[];
  dbBankAccounts: DBBankAccount[];
  dbCurrencies: DBCurrency[];
  dbOpenBankingAccounts: DBOpenBankingAccount[];
  obAccounts: OpenBankingAccount[];
}> = async ({ params }) => {
  const bankId = parseInt(params.bankId as string, 10);
  const banks = await prisma.bank.findMany();
  const bankAccounts = await prisma.bankAccount.findMany({
    where: {
      bankId: bankId,
    },
  });
  const currencies = await prisma.currency.findMany();
  const dbOpenBankingAccounts = await prisma.openBankingAccount.findMany({
    where: {
      bankAccountId: {
        in: bankAccounts.map((x) => x.id),
      },
    },
  });

  const dbToken = await prisma.openBankingToken.findFirstOrThrow({
    where: {
      bankId: bankId,
    },
  });
  const token = await maybeRefreshToken(dbToken);
  const obAccounts = await fetch(`https://api.truelayer.com/data/v1/accounts`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token.accessToken}` },
  })
    .then((r) => r.json())
    .then((x) => {
      console.log(x);
      return x.results.map((r) => {
        const oba: OpenBankingAccount = {
          openBankingAccountId: r.account_id,
          displayName: r.display_name,
          currency: r.currency,
          providerDisplayName: r.provider.display_name,
          providerId: r.provider.provider_id,
        };
        return oba;
      });
    });

  console.log(obAccounts);

  return {
    props: JSON.parse(
      JSON.stringify({
        bankId,
        dbBanks: banks,
        dbBankAccounts: bankAccounts,
        dbCurrencies: currencies,
        dbOpenBankingAccounts: dbOpenBankingAccounts,
        obAccounts: obAccounts,
      })
    ),
  };
};

export default function ConnectBanksPage({
  bankId,
  dbBanks,
  dbBankAccounts,
  dbCurrencies,
  dbOpenBankingAccounts: dbOpenBankingAccountsInitial,
  obAccounts,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [requestInFlight, setRequestInFlight] = useState(false);
  const [apiError, setApiError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const currencies = new Currencies(dbCurrencies);
  const [banks] = banksModelFromDatabaseData(
    dbBanks,
    dbBankAccounts,
    currencies
  );
  const [dbOpenBankingAccounts, setDbOpenBankingAccounts] = useState(
    dbOpenBankingAccountsInitial
  );
  const dbOpenBankingAccountsByOpenBankingId = Object.fromEntries(
    dbOpenBankingAccounts.map((a) => [a.openBankingAccountId, a])
  );
  const initialMapping = Object.fromEntries(
    dbOpenBankingAccounts.map((x) => [x.openBankingAccountId, x.bankAccountId])
  );
  const [mapping, setMapping] = useState(
    Object.fromEntries(
      obAccounts.map((a) => [
        a.openBankingAccountId,
        initialMapping[a.openBankingAccountId] ?? -1,
      ])
    )
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");
    setStatusMessage("");
    setRequestInFlight(true);
    try {
      const requestMapping = Object.entries(mapping).map(
        ([openBankingAccountId, appAccountId]) => {
          return {
            id: dbOpenBankingAccountsByOpenBankingId[openBankingAccountId]?.id,
            bankAccountId: appAccountId,
            openBankingAccountId: openBankingAccountId,
          };
        }
      );
      const body: AccountMappingRequest = {
        bankId,
        mapping: requestMapping,
      };
      const response = await fetch("/api/open-banking/account-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setDbOpenBankingAccounts(await response.json());
      setStatusMessage("Success!");
    } catch (error) {
      setApiError(`Failed to add: ${error}`);
    }
    setRequestInFlight(false);
  };

  return (
    <Layout>
      {statusMessage && <span className="text-green-500">{statusMessage}</span>}
      {obAccounts.map((oba) => (
        <>
          <div key={oba.openBankingAccountId}>
            {oba.providerDisplayName} {oba.displayName} ({oba.currency})
            connected with
            <Select
              disabled={requestInFlight}
              value={mapping[oba.openBankingAccountId]}
              onChange={(e) =>
                setMapping((old) =>
                  Object.assign({}, old, {
                    [oba.openBankingAccountId]: +e.target.value,
                  })
                )
              }
            >
              <option value="0">None</option>
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
      {apiError && <span className="text-red-500">{apiError}</span>}
      <ButtonFormPrimary
        onClick={handleSubmit}
        disabled={requestInFlight}
        label={requestInFlight ? "Saving…" : "Save"}
      />
    </Layout>
  );
}
