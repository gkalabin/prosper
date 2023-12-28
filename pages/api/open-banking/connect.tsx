import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import prisma from "lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

async function handle(
  userName: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const code = req.query.code as string;
  // TODO: use proper hostname
  const redirectURI = `http://127.0.0.1:3000/api/open-banking/connect`;

  if (!code) {
    const authURL = `https://auth.truelayer.com/?response_type=code&client_id=${process.env.TRUE_LAYER_CLIENT_ID}&scope=accounts%20balance%20transactions%20offline_access&redirect_uri=${redirectURI}`;
    res.redirect(authURL);
    return;
  }
  // TODO: handle promise rejection case
  const response = await fetch(`https://auth.truelayer.com/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: code,
      redirect_uri: redirectURI,
      grant_type: "authorization_code",
      client_id: process.env.TRUE_LAYER_CLIENT_ID,
      client_secret: process.env.TRUE_LAYER_CLIENT_SECRET,
    }),
  });

  const tokenResponse = await response.json();
  console.log("response is ", tokenResponse);
  const now = new Date();
  const dbToken = await prisma.openBankingToken.create({
    data: Object.assign({}, tokenResponse, {
      tokenCreatedAt: now,
      tokenValidUntil: new Date(
        now.getTime() + tokenResponse.expires_in * 1000
      ),
    }),
  });
  res.redirect(`/config/open-banking/connect/${dbToken.id}`);
}

export default authenticatedApiRoute("GET", handle);
