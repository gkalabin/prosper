import { OpenBankingToken } from "@prisma/client";
import prisma from "./prisma";

export async function maybeRefreshToken(token: OpenBankingToken) {
  const now = new Date();
  if (token.tokenValidUntil > now) {
    return token;
  }
  const response = await fetch(`https://auth.truelayer.com/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      refresh_token: token.refreshToken,
      grant_type: "refresh_token",
      client_id: process.env.TRUE_LAYER_CLIENT_ID,
      client_secret: process.env.TRUE_LAYER_CLIENT_SECRET,
    }),
  });

  const tokenResponse = await response.json();
  return await prisma.openBankingToken.update({
    data: {
      accessToken: tokenResponse.access_token,
      expiresIn: tokenResponse.expires_in,
      tokenType: tokenResponse.token_type,
      refreshToken: tokenResponse.refresh_token,
      scope: tokenResponse.scope,
      tokenCreatedAt: now.toISOString(),
      tokenValidUntil: new Date(
        now.getTime() + tokenResponse.expires_in * 1000
      ).toISOString(),
    },
    where: {
      id: token.id,
    },
  });
}
