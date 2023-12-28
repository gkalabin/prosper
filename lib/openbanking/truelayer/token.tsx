import { TrueLayerToken } from "@prisma/client";
import { isBefore } from "date-fns";
import { DB } from "lib/db";
import prisma from "lib/prisma";

export async function maybeRefreshToken(
  db: DB,
  token: TrueLayerToken
): Promise<TrueLayerToken> {
  const now = new Date();
  if (isBefore(now, token.tokenValidUntil)) {
    return token;
  }
  const fetched = await fetch(`https://auth.truelayer.com/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      refresh_token: token.refreshToken,
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
        } ${bankName}: ${JSON.stringify(json, null, 2)}`
      );
    } catch (e) {
      // ignore the error and show whatever status we got
      const text = await fetched.text();
      console.warn(
        `Failed to refresh token for bank ${token.bankId} ${bankName}: ${text}`
      );
    }
    return Promise.reject(`Refresh token for ${bankName} failed: ${reason}`);
  }
  const json = await fetched.json();
  const { access_token, expires_in, token_type, refresh_token, scope } = json;
  const newToken = await prisma.trueLayerToken.update({
    data: {
      accessToken: access_token,
      expiresIn: expires_in,
      tokenType: token_type,
      refreshToken: refresh_token,
      scope: scope,
      tokenCreatedAt: now.toISOString(),
      tokenValidUntil: new Date(
        now.getTime() + expires_in * 1000
      ).toISOString(),
    },
    where: {
      id: token.id,
    },
  });
  return newToken;
}
