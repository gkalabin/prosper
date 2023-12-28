import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import prisma from "lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

async function handle(
  userId: number,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const code = req.query.code as string;
  // TODO: use proper hostname
  const redirectURI = `http://127.0.0.1:3000/api/open-banking/connect`;

  if (!code) {
    const connectingBankId = parseInt(req.query.bankId as string, 10);
    const authURL = `https://auth.truelayer.com/?response_type=code&client_id=${process.env.TRUE_LAYER_CLIENT_ID}&scope=accounts%20balance%20transactions%20offline_access&redirect_uri=${redirectURI}&state=${connectingBankId}`;
    res.redirect(authURL);
    return;
  }
  const connectingBankId = parseInt(req.query.state as string, 10);
  await fetch(`https://auth.truelayer.com/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: code,
      redirect_uri: redirectURI,
      grant_type: "authorization_code",
      client_id: process.env.TRUE_LAYER_CLIENT_ID,
      client_secret: process.env.TRUE_LAYER_CLIENT_SECRET,
    }),
  })
    .then(async (response) => {
      const tokenResponse = await response.json();
      const now = new Date();
      const args = {
        accessToken: tokenResponse.access_token,
        expiresIn: tokenResponse.expires_in,
        tokenType: tokenResponse.token_type,
        refreshToken: tokenResponse.refresh_token,
        scope: tokenResponse.scope,

        bankId: connectingBankId,
        tokenCreatedAt: now.toISOString(),
        tokenValidUntil: new Date(
          now.getTime() + tokenResponse.expires_in * 1000
        ).toISOString(),
        connectionCreatedAt: now.toISOString(),
        connectionValidUntil: new Date(
          // 90 days in the future
          now.getTime() + 90 * 24 * 60 * 60 * 1000
        ).toISOString(),
        userId,
      };
      await prisma.openBankingToken.create({ data: args });
      res.redirect(`/config/open-banking/connection/${connectingBankId}`);
    })
    .catch((err) => {
      res.status(500).send(`Open banking api error: ${err}`);
    });
}

export default authenticatedApiRoute("GET", handle);
