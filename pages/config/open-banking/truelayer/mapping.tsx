import {
  Bank as DBBank,
  BankAccount as DBBankAccount,
  Currency as DBCurrency,
  ExternalAccountMapping as DBExternalAccountMapping,
} from "@prisma/client";
import { ConfigPageLayout } from "components/ConfigPageLayout";
import { Select } from "components/forms/Select";
import { ButtonFormPrimary } from "components/ui/buttons";
import { banksModelFromDatabaseData } from "lib/ClientSideModel";
import { DB } from "lib/db";
import { Currencies } from "lib/model/Currency";
import { AccountDetails } from "lib/openbanking/interface";
import { fetchAccounts } from "lib/openbanking/truelayer/account";
import { maybeRefreshToken } from "lib/openbanking/truelayer/token";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "pages/api/auth/[...nextauth]";
import { AccountMappingRequest } from "pages/api/open-banking/account-mapping";
import { useState } from "react";

export const getServerSideProps: GetServerSideProps<{
  data?: {
    dbBank: DBBank;
    dbBankAccounts: DBBankAccount[];
    dbCurrencies: DBCurrency[];
    dbMapping: DBExternalAccountMapping[];
    obAccounts: AccountDetails[];
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
  const dbMapping = await db.externalAccountMappingFindMany({
    where: {
      internalAccountId: {
        in: bankAccounts.map((x) => x.id),
      },
    },
  });

  const [dbToken] = await db.trueLayerTokenFindMany({
    where: { bankId },
  });
  const token = await maybeRefreshToken(dbToken);
  const obAccounts = await fetchAccounts(token);
  return {
    props: {
      data: JSON.parse(
        JSON.stringify({
          dbBank: bank,
          dbBankAccounts: bankAccounts,
          dbCurrencies: currencies,
          dbMapping,
          obAccounts,
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
    dbMapping: dbMappingInitial,
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
  const [dbMapping, setDbMapping] = useState(dbMappingInitial);
  const initialMapping = Object.fromEntries(
    dbMapping.map((x) => [x.externalAccountId, x.internalAccountId])
  );
  const [mapping, setMapping] = useState(
    Object.fromEntries(
      obAccounts.map((a) => [
        a.externalAccountId,
        initialMapping[a.externalAccountId] ?? -1,
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
        ([externalAccountId, internalAccountId]) => {
          return {
            internalAccountId,
            externalAccountId,
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
      setDbMapping(await response.json());
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
          <div key={oba.externalAccountId}>
            TrueLayer account <i>{oba.name}</i> connected with
            <Select
              disabled={requestInFlight}
              value={mapping[oba.externalAccountId]}
              onChange={(e) =>
                setMapping((old) =>
                  Object.assign({}, old, {
                    [oba.externalAccountId]: +e.target.value,
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
