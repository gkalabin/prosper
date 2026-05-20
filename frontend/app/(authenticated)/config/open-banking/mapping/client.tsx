'use client';
import {AccountMappingRequest} from '@/app/api/open-banking/mapping/route';
import {Button} from '@/components/ui/button';
import {Select} from '@/components/ui/html-select';
import {
  AccountMapping,
  ExternalAccount,
} from '@/lib/grpc/gen/prosper/v1/openbanking';
import {
  Bank as ProtoBank,
  BankAccount as ProtoBankAccount,
  Stock as ProtoStock,
} from '@/lib/grpc/gen/prosper/v1/ledger';
import {accountUnit, bankAccountModelFromDB} from '@/lib/model/BankAccount';
import {stockModelFromDB} from '@/lib/model/Stock';
import {Unit, isCurrency} from '@/lib/model/Unit';
import {useState} from 'react';

function UnitName({unit}: {unit: Unit}) {
  if (isCurrency(unit)) {
    return <>{unit.code}</>;
  }
  return <>{unit.ticker}</>;
}

export function OpenBankingMappingConfigPage({
  bank,
  bankAccounts,
  mappings: mappingsInitial,
  stocks,
  externalAccounts,
}: {
  bank: ProtoBank;
  bankAccounts: ProtoBankAccount[];
  mappings: AccountMapping[];
  stocks: ProtoStock[];
  externalAccounts: ExternalAccount[];
}) {
  const [requestInFlight, setRequestInFlight] = useState(false);
  const [apiError, setApiError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const stockModels = stocks.map(stockModelFromDB);
  const accountModels = bankAccounts.map(bankAccountModelFromDB);
  const [storedMappings, setStoredMappings] = useState(mappingsInitial);
  const initialMapping = Object.fromEntries(
    storedMappings.map(x => [x.externalAccountId, x.internalAccountId])
  );
  const [mapping, setMapping] = useState(
    Object.fromEntries(
      externalAccounts.map(a => [
        a.externalId,
        initialMapping[a.externalId] ?? -1,
      ])
    )
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    setStatusMessage('');
    setRequestInFlight(true);
    try {
      const requestMapping: AccountMapping[] = Object.entries(mapping).map(
        ([externalAccountId, internalAccountId]) => ({
          internalAccountId,
          externalAccountId,
        })
      );
      const body: AccountMappingRequest = {
        bankId: bank.id,
        mapping: requestMapping,
      };
      const response = await fetch('/api/open-banking/mapping', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
      });
      setStoredMappings(await response.json());
      setStatusMessage('Success!');
    } catch (error) {
      setApiError(`Failed to add: ${error}`);
    }
    setRequestInFlight(false);
  };
  return (
    <>
      {statusMessage && <span className="text-green-500">{statusMessage}</span>}
      {externalAccounts.map(external => (
        <div key={external.externalId}>
          External account <i>{external.name}</i> connected with
          <Select
            disabled={requestInFlight}
            value={mapping[external.externalId]}
            onChange={e =>
              setMapping(old => ({
                ...old,
                [external.externalId]: +e.target.value,
              }))
            }
          >
            <option value="0">None</option>
            {accountModels.map(a => (
              <option key={a.id} value={a.id}>
                <>
                  {bank.name} {a.name} (
                  <UnitName unit={accountUnit(a, stockModels)} />)
                </>
              </option>
            ))}
          </Select>
        </div>
      ))}
      {apiError && <span className="text-red-500">{apiError}</span>}
      <Button onClick={handleSubmit} disabled={requestInFlight} type="submit">
        {requestInFlight ? 'Saving…' : 'Save'}
      </Button>
    </>
  );
}
