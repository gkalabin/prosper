'use client';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Bank as DBBank} from '@prisma/client';
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
          <Label htmlFor="token">Personal token</Label>
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
          <Button type="submit" disabled={!token}>
            Connect
          </Button>
        </div>
      </form>
    </>
  );
}
