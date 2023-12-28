import { NordigenToken } from "@prisma/client";
import { isBefore } from "date-fns";
import { DB } from "lib/db";
import prisma from "lib/prisma";

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
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret_id: process.env.NORDIGEN_SECRET_ID,
      secret_key: process.env.NORDIGEN_SECRET_KEY,
    }),
  });
  const { access, access_expires, refresh, refresh_expires } = await r.json();
  const now = new Date();
  const data = {
    access,
    accessValidUntil: new Date(
      now.getTime() + access_expires * 1000
    ).toISOString(),
    refresh,
    refreshValidUntil: new Date(
      now.getTime() + refresh_expires * 1000
    ).toISOString(),
    userId: db.getUserId(),
    bankId,
  };
  return await prisma.nordigenToken.upsert({
    create: data,
    update: data,
    where: {
      bankId,
    },
  });
}

export async function refreshToken(
  db: DB,
  token: NordigenToken
): Promise<NordigenToken> {
  const fetched = await fetch(`https://ob.nordigen.com/api/v2/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: token.refresh }),
  });
  if (fetched.status !== 200) {
    const [bank] = await db.bankFindMany({
      where: {
        id: token.bankId,
      },
    });
    const bankName = bank?.name || "unknown bank";
    const reason = fetched.statusText;
    const text = await fetched.text();
    console.warn(
      `Failed to refresh token for bank ${token.bankId} ${bankName}: ${text}`
    );
    return Promise.reject(`Refresh token for ${bankName} failed: ${reason}`);
  }
  const json = await fetched.json();
  const { access, access_expires } = json;
  const now = new Date();
  const updatedToken = await prisma.nordigenToken.update({
    data: {
      access,
      accessValidUntil: new Date(
        now.getTime() + access_expires * 1000
      ).toISOString(),
    },
    where: {
      id: token.id,
    },
  });
  return updatedToken;
}
