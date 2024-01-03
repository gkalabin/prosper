'use client';
import {Bank as DBBank} from '@prisma/client';
import {Input} from 'components/forms/Input';
import {ButtonFormPrimary} from 'components/ui/buttons';
import {useState} from 'react';

export function ConnectForm({dbBank}: {dbBank: DBBank}) {
  const [token, setToken] = useState('');
  return (
    <>
      <h1 className="text-2xl font-semibold">
        Connecting {dbBank.name} with Starling Bank API
      </h1>
      <form
        action={`/api/open-banking/starling/connect?bankId=${dbBank.id}`}
        method="POST"
        className="mt-4 space-y-4"
      >
        <div>
          <label
            htmlFor="token"
            className="block text-sm font-medium text-gray-700"
          >
            Personal token
          </label>
          <Input
            id="token"
            type="text"
            name="token"
            className="block w-full"
            value={token}
            onChange={e => setToken(e.target.value)}
          />
        </div>
        <div className="flex justify-end">
          <ButtonFormPrimary type="submit" disabled={!token}>
            Connect
          </ButtonFormPrimary>
        </div>
      </form>
    </>
  );
}
