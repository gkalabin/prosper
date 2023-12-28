"use client";
import {
  Bank as DBBank,
  BankAccount as DBBankAccount,
  Stock as DBStock,
  ExternalAccountMapping,
} from "@prisma/client";
import { AccountMappingRequest } from "app/api/open-banking/mapping/route";
import { Select } from "components/forms/Select";
import { ButtonFormPrimary } from "components/ui/buttons";
import { banksModelFromDatabaseData } from "lib/ClientSideModel";
import { accountUnit } from "lib/model/BankAccount";
import { Unit, isCurrency } from "lib/model/Unit";
import { AccountDetails } from "lib/openbanking/interface";
import { useState } from "react";

function UnitName({ unit }: { unit: Unit }) {
  if (isCurrency(unit)) {
    return <>{unit.code()}</>;
  }
  return <>{unit.ticker}</>;
}

export function OpenBankingMappingConfigPage({
  dbBank,
  dbBankAccounts,
  dbMapping: dbMappingInitial,
  dbStocks,
  externalAccounts,
}: {
  dbBank: DBBank;
  dbBankAccounts: DBBankAccount[];
  dbMapping: ExternalAccountMapping[];
  dbStocks: DBStock[];
  externalAccounts: AccountDetails[];
}) {
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
    <>
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
                  {bank.name} {ba.name} (
                  <UnitName unit={accountUnit(ba, stocks)} />)
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
    </>
  );
}
