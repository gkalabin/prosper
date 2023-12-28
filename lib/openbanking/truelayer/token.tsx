import { TrueLayerToken } from "@prisma/client";
import { isBefore } from "date-fns";
import prisma from "lib/prisma";

export async function maybeRefreshToken(
  token: TrueLayerToken
): Promise<TrueLayerToken> {
  const now = new Date();
  if (isBefore(now, token.tokenValidUntil)) {
    return token;
  }
  return fetch(`https://auth.truelayer.com/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      refresh_token: token.refreshToken,
      grant_type: "refresh_token",
      client_id: process.env.TRUE_LAYER_CLIENT_ID,
      client_secret: process.env.TRUE_LAYER_CLIENT_SECRET,
    }),
  })
    .then((r) => r.json())
    .then(({ access_token, expires_in, token_type, refresh_token, scope }) => {
      return prisma.trueLayerToken.update({
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
    });
}
