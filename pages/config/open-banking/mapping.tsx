import {
  Bank as DBBank,
  BankAccount as DBBankAccount,
  Stock as DBStock,
  ExternalAccountMapping,
} from "@prisma/client";
import Layout from "components/Layout";
import { Select } from "components/forms/Select";
import { ButtonFormPrimary } from "components/ui/buttons";
import { banksModelFromDatabaseData } from "lib/ClientSideModel";
import { DB } from "lib/db";
import { accountUnit } from "lib/model/BankAccount";
import { fetchAccounts } from "lib/openbanking/fetchall";
import { AccountDetails } from "lib/openbanking/interface";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "pages/api/auth/[...nextauth]";
import { AccountMappingRequest } from "pages/api/open-banking/mapping";
import { useState } from "react";

export const getServerSideProps: GetServerSideProps<{
  dbBank: DBBank;
  dbBankAccounts: DBBankAccount[];
  dbStocks: DBStock[];
  dbMapping: ExternalAccountMapping[];
  externalAccounts: AccountDetails[];
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
  const userId = +session.user.id;
  const db = new DB({ userId });
  const bankId = parseInt(query.bankId as string, 10);
  if (!bankId) {
    return {
      notFound: true,
    };
  }
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
  const externalAccounts = await fetchAccounts(db, bankId);
  if (externalAccounts == null) {
    return {
      notFound: true,
    };
  }
  const internalAccounts = await db.bankAccountFindMany({
    where: {
      bankId,
    },
  });
  const data = {
    dbBank: bank,
    dbBankAccounts: internalAccounts,
    dbStocks: await db.stocksFindMany(),
    dbMapping: await db.externalAccountMappingFindMany({
      where: {
        internalAccountId: {
          in: internalAccounts.map((x) => x.id),
        },
      },
    }),
    externalAccounts,
  };
  return {
    props: JSON.parse(JSON.stringify(data)),
  };
};

export default function Page({
  dbBank,
  dbBankAccounts,
  dbMapping: dbMappingInitial,
  dbStocks,
  externalAccounts,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [requestInFlight, setRequestInFlight] = useState(false);
  const [apiError, setApiError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [[bank], allBankAccounts, stocks] = banksModelFromDatabaseData(
    [dbBank],
    dbBankAccounts,
    dbStocks,
  );
  const accountsForBank = allBankAccounts.filter((x) => x.bankId === dbBank.id);
  const [dbMapping, setDbMapping] = useState(dbMappingInitial);
  const initialMapping = Object.fromEntries(
    dbMapping.map((x) => [x.externalAccountId, x.internalAccountId]),
  );
  const [mapping, setMapping] = useState(
    Object.fromEntries(
      externalAccounts.map((a) => [
        a.externalAccountId,
        initialMapping[a.externalAccountId] ?? -1,
      ]),
    ),
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
        },
      );
      const body: AccountMappingRequest = {
        bankId: dbBank.id,
        mapping: requestMapping,
      };
      const response = await fetch("/api/open-banking/mapping", {
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
    <Layout>
      {statusMessage && <span className="text-green-500">{statusMessage}</span>}
      {externalAccounts.map((external) => (
        <div key={external.externalAccountId}>
          External account <i>{external.name}</i> connected with
          <Select
            disabled={requestInFlight}
            value={mapping[external.externalAccountId]}
            onChange={(e) =>
              setMapping((old) => ({
                ...old,
                [external.externalAccountId]: +e.target.value,
              }))
            }
          >
            <option value="0">None</option>
            {accountsForBank.map((ba) => (
              <option key={ba.id} value={ba.id}>
                <>
                  {bank.name} {ba.name} ({accountUnit(ba, stocks)})
                </>
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
    </Layout>
  );
}
