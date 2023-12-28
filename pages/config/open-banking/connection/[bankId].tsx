import {
  Bank as DBBank,
  BankAccount as DBBankAccount,
  Currency as DBCurrency,
  OpenBankingAccount as DBOpenBankingAccount,
} from "@prisma/client";
import { ConfigPageLayout } from "components/ConfigPageLayout";
import { Select } from "components/forms/Select";
import { ButtonFormPrimary } from "components/ui/buttons";
import { banksModelFromDatabaseData } from "lib/ClientSideModel";
import { DB } from "lib/db";
import { Currencies } from "lib/model/Currency";
import { maybeRefreshToken } from "lib/openbanking/token";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "pages/api/auth/[...nextauth]";
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
  data?: {
    dbBank: DBBank;
    dbBankAccounts: DBBankAccount[];
    dbCurrencies: DBCurrency[];
    dbOpenBankingAccounts: DBOpenBankingAccount[];
    obAccounts: OpenBankingAccount[];
  };
}> = async ({ params, req, res }) => {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return { props: {} };
  }
  const bankId = parseInt(params.bankId as string, 10);
  const userId = +session.user.id;
  const db = new DB({ userId });
  const [bank] = await db.bankFindMany({
    where: {
      id: bankId,
    },
  });
  if (!bank) {
    return {
      notFound: true,
    };
  }
  const bankAccounts = await db.bankAccountFindMany({
    where: { bankId },
  });
  const currencies = await db.currencyFindMany();
  const dbOpenBankingAccounts = await db.openBankingAccountFindMany({
    where: {
      bankAccountId: {
        in: bankAccounts.map((x) => x.id),
      },
    },
  });

  const [dbToken] = await db.openBankingTokenFindMany({
    where: { bankId },
  });
  const token = await maybeRefreshToken(dbToken);
  const obAccounts = await fetch(`https://api.truelayer.com/data/v1/accounts`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token.accessToken}` },
  })
    .then((r) => r.json())
    .then((x) => {
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
  return {
    props: {
      data: JSON.parse(
        JSON.stringify({
          dbBank: bank,
          dbBankAccounts: bankAccounts,
          dbCurrencies: currencies,
          dbOpenBankingAccounts: dbOpenBankingAccounts,
          obAccounts: obAccounts,
        })
      ),
    },
  };
};

export default function ConnectBanksPage({
  data: {
    dbBank,
    dbBankAccounts,
    dbCurrencies,
    dbOpenBankingAccounts: dbOpenBankingAccountsInitial,
    obAccounts,
  },
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [requestInFlight, setRequestInFlight] = useState(false);
  const [apiError, setApiError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const currencies = new Currencies(dbCurrencies);
  const [[bank]] = banksModelFromDatabaseData(
    [dbBank],
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
        bankId: dbBank.id,
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
    <ConfigPageLayout>
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
              {bank.accounts.map((ba) => (
                <option key={ba.id} value={ba.id}>
                  {bank.name} {ba.name}
                </option>
              ))}
            </Select>
          </div>
        </>
      ))}
      {apiError && <span className="text-red-500">{apiError}</span>}
      <ButtonFormPrimary
        onClick={handleSubmit}
        disabled={requestInFlight}
        type="submit"
      >
        {requestInFlight ? "Saving…" : "Save"}
      </ButtonFormPrimary>
    </ConfigPageLayout>
  );
}
