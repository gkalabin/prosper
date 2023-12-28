import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import { DB } from "lib/db";
import prisma from "lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

async function handle(
  userId: number,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const code = req.query.code as string;
  const redirectURI = `${process.env.HOST}/api/open-banking/truelayer/connect`;

  if (!code) {
    const connectingBankId = parseInt(req.query.bankId as string, 10);
    const authURL = `https://auth.truelayer.com/?response_type=code&client_id=${process.env.TRUE_LAYER_CLIENT_ID}&scope=accounts%20balance%20transactions%20offline_access&redirect_uri=${redirectURI}&state=${connectingBankId}`;
    res.redirect(authURL);
    return;
  }
  const bankId = parseInt(req.query.state as string, 10);
  try {
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
    const now = new Date();
    const args = {
      access: tokenResponse.access_token,
      accessValidUntil: new Date(
        now.getTime() + tokenResponse.expires_in * 1000
      ).toISOString(),
      refresh: tokenResponse.refresh_token,
      refreshValidUntil: new Date(
        // 90 days in the future
        now.getTime() + 90 * 24 * 60 * 60 * 1000
      ).toISOString(),
      userId,
      bankId,
    };
    const db = new DB({ userId });
    const [existing] = await db.trueLayerTokenFindMany({ where: { bankId } });
    if (existing) {
      await prisma.trueLayerToken.update({
        data: args,
        where: { bankId },
      });
      res.redirect(`/overview`);
      return;
    }
    await prisma.trueLayerToken.create({
      data: args,
    });
    res.redirect(`/config/open-banking/mapping?bankId=${bankId}`);
  } catch (err) {
    res.status(500).send(`Open banking api error: ${err}`);
  }
}

export default authenticatedApiRoute("GET", handle);