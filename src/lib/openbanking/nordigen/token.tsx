import {assert} from '@/lib/assert';
import {DB, invalidateCache} from '@/lib/db';
import prisma from '@/lib/prisma';
import {NordigenRequisition, NordigenToken} from '@prisma/client';
import {addSeconds, isBefore} from 'date-fns';

export async function getOrCreateToken(db: DB, bankId: number) {
  const now = new Date();
  const [token] = await db.nordigenTokenFindMany({
    where: {
      bankId,
    },
  });
  if (token && isBefore(now, token.accessValidUntil)) {
    return token;
  }
  if (!token || isBefore(token.refreshValidUntil, now)) {
    return createToken(db, bankId);
  }
  return refreshToken(db, token);
}

async function createToken(db: DB, bankId: number): Promise<NordigenToken> {
  const r = await fetch(`https://ob.nordigen.com/api/v2/token/new/`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      secret_id: process.env.NORDIGEN_SECRET_ID,
      secret_key: process.env.NORDIGEN_SECRET_KEY,
    }),
  });
  const {access, access_expires, refresh, refresh_expires} = await r.json();
  const now = new Date();
  const data = {
    access,
    accessValidUntil: addSeconds(now, access_expires).toISOString(),
    refresh,
    refreshValidUntil: addSeconds(now, refresh_expires).toISOString(),
    userId: db.getUserId(),
    bankId,
  };
  const result = await prisma.nordigenToken.upsert({
    create: data,
    update: data,
    where: {
      bankId,
    },
  });
  await invalidateCache(db.getUserId());
  return result;
}

export async function refreshToken(
  db: DB,
  token: NordigenToken
): Promise<NordigenToken> {
  const fetched = await fetch(`https://ob.nordigen.com/api/v2/token/refresh/`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({refresh: token.refresh}),
  });
  if (fetched.status !== 200) {
    const [bank] = await db.bankFindMany({
      where: {
        id: token.bankId,
      },
    });
    const bankName = bank?.name || 'unknown bank';
    const reason = fetched.statusText;
    const text = await fetched.text();
    console.warn(
      `Failed to refresh token for bank ${token.bankId} ${bankName}: ${text}`
    );
    return Promise.reject(`Refresh token for ${bankName} failed: ${reason}`);
  }
  const json = await fetched.json();
  const {access, access_expires} = json;
  const now = new Date();
  const updatedToken = await prisma.nordigenToken.update({
    data: {
      access,
      accessValidUntil: addSeconds(now, access_expires).toISOString(),
    },
    where: {
      id: token.id,
    },
  });
  await invalidateCache(db.getUserId());
  return updatedToken;
}

export async function deleteToken(
  db: DB,
  token: NordigenToken,
  requisition: NordigenRequisition
): Promise<void> {
  assert(
    token.bankId === requisition.bankId,
    `bankId mismatch: token bank id is ${token.bankId}, requisition bank id is ${requisition.bankId}`
  );
  const response = await fetch(
    `https://ob.nordigen.com/api/v2/requisitions/${requisition.requisitionId}/`,
    {
      method: 'DELETE',
      headers: {Authorization: `Bearer ${token.access}`},
    }
  );
  const responseText = await response.text();
  // FIXME: error handling here is overly simplistic, it allows for the case
  // where the token is deleted from TrueLayer but not from the database.
  if (response.status !== 200) {
    if (response.status === 404) {
      console.warn(
        `Requisition ${requisition.id} is not found in Nordigen API: ${responseText}`
      );
      // Okay to proceed with deleting the token and requisition.
    } else {
      throw new Error(
        `Failed to delete nordigen requisition ${requisition.id} (code ${response.status}): ${responseText}`
      );
    }
  }
  console.info('Deleted nordigen requisition', requisition.id, responseText);
  await db.nordigenTokenDelete({where: {bankId: token.bankId}});
  await db.nordigenRequisitionDelete({where: {bankId: requisition.bankId}});
}
