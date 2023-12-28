import {
  Bank as DBBank,
  BankAccount as DBBankAccount,
  Currency as DBCurrency,
  ExternalAccountMapping,
} from "@prisma/client";
import { ConfigPageLayout } from "components/ConfigPageLayout";
import { Select } from "components/forms/Select";
import { ButtonFormPrimary } from "components/ui/buttons";
import { banksModelFromDatabaseData } from "lib/ClientSideModel";
import { DB } from "lib/db";
import { Currencies } from "lib/model/Currency";
import { getOrCreateToken } from "lib/openbanking/nordigen/token";
import {
  AccountDetails,
  fetchAccounts,
} from "lib/openbanking/nordigen/accountDetails";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "pages/api/auth/[...nextauth]";
import { AccountMappingRequest } from "pages/api/open-banking/account-mapping";
import { useState } from "react";

export const getServerSideProps: GetServerSideProps<{
  dbBank: DBBank;
  dbBankAccounts: DBBankAccount[];
  dbCurrencies: DBCurrency[];
  dbMapping: ExternalAccountMapping[];
  nordigenAccounts: AccountDetails[];
}> = async ({ query, req, res }) => {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }
  const bankId = parseInt(query.bankId as string, 10);
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
  const requisition = await db.nordigenRequisitionFindFirst({
    where: {
      bankId,
    },
  });
  if (!requisition) {
    return {
      notFound: true,
    };
  }
  const token = await getOrCreateToken(db, bankId);
  const nordigenAccounts = await fetchAccounts(token, requisition);
  const dbBankAccounts = await db.bankAccountFindMany({
    where: {
      bankId,
    },
  });
  return {
    props: JSON.parse(
      JSON.stringify({
        dbBank: bank,
        dbBankAccounts: dbBankAccounts,
        dbCurrencies: await db.currencyFindMany(),
        dbMapping: await db.externalAccountMappingFindMany({
          where: {
            internalAccountId: {
              in: dbBankAccounts.map((x) => x.id),
            },
          },
        }),
        nordigenAccounts,
      })
    ),
  };
};

export default function Page({
  dbBank,
  dbBankAccounts,
  dbMapping: dbMappingInitial,
  dbCurrencies,
  nordigenAccounts,
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
      nordigenAccounts.map((a) => [a.id, initialMapping[a.id] ?? -1])
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
      {nordigenAccounts.map((nordigenAccount) => (
        <div key={nordigenAccount.id}>
          Nordigen account {nordigenAccount.name} connected with
          <Select
            disabled={requestInFlight}
            value={mapping[nordigenAccount.id]}
            onChange={(e) =>
              setMapping((old) => ({
                ...old,
                [nordigenAccount.id]: +e.target.value,
              }))
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
