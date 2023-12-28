import { TrueLayerToken } from "@prisma/client";
import { addDays, addSeconds } from "date-fns";
import { DB } from "lib/db";
import prisma from "lib/prisma";

export async function refreshToken(
  db: DB,
  token: TrueLayerToken,
): Promise<TrueLayerToken> {
  const now = new Date();
  const fetched = await fetch(`https://auth.truelayer.com/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      refresh_token: token.refresh,
      grant_type: "refresh_token",
      client_id: process.env.TRUE_LAYER_CLIENT_ID,
      client_secret: process.env.TRUE_LAYER_CLIENT_SECRET,
    }),
  });
  if (fetched.status !== 200) {
    const [bank] = await db.bankFindMany({
      where: {
        id: token.bankId,
      },
    });
    const bankName = bank?.name || "unknown bank";
    let reason = fetched.statusText;
    try {
      const json = await fetched.json();
      reason = json?.error_details?.reason ?? reason;
      console.warn(
        `Failed to refresh token for bank ${
          token.bankId
        } ${bankName}: ${JSON.stringify(json, null, 2)}`,
      );
    } catch (e) {
      // ignore the error and show whatever status we got
      const text = await fetched.text();
      console.warn(
        `Failed to refresh token for bank ${token.bankId} ${bankName}: ${text}`,
      );
    }
    return Promise.reject(`Refresh token for ${bankName} failed: ${reason}`);
  }
  const json = await fetched.json();
  const { access_token, expires_in, refresh_token } = json;
  const newToken = await prisma.trueLayerToken.update({
    data: {
      access: access_token,
      accessValidUntil: addSeconds(now, expires_in).toISOString(),
      refresh: refresh_token,
      refreshValidUntil: addDays(now, 30).toISOString(),
    },
    where: {
      id: token.id,
    },
  });
  return newToken;
}

export async function deleteToken(
  db: DB,
  token: TrueLayerToken,
): Promise<void> {
  const response = await fetch(`https://auth.truelayer.com/api/delete`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token.access}`,
    },
  });
  // FIXME: error handling here is overly simplistic, it allows for the case
  // where the token is deleted from TrueLayer but not from the database.
  if (response.status !== 200) {
    if (response.status === 401) {
      // TrueLayer returns 401 if the token is already deleted, okay to continue.
      console.warn(
        `Got code ${
          response.status
        } from TrueLayer while deleting the token for bank ${
          token.bankId
        }: ${await response.text()}`,
      );
    } else {
      const text = await response.text();
      return Promise.reject(
        `Failed to delete true layer token for bank id ${token.bankId} (code ${response.status}): ${text}`,
      );
    }
  }
  await db.trueLayerTokenDelete({ where: { bankId: token.bankId } });
}
