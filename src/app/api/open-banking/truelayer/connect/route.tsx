import {DEFAULT_AUTHENTICATED_PAGE} from '@/lib/auth/const';
import {getUserIdOrRedirect} from '@/lib/auth/user';
import {DB} from '@/lib/db';
import prisma from '@/lib/prisma';
import {positiveIntOrNull} from '@/lib/util/searchParams';
import {Prisma} from '@prisma/client';
import {redirect} from 'next/navigation';
import {NextRequest} from 'next/server';

export async function GET(request: NextRequest): Promise<Response> {
  const userId = await getUserIdOrRedirect();
  const query = request.nextUrl.searchParams;
  const code = query.get('code');
  const redirectURI = `${process.env.PUBLIC_APP_URL}/api/open-banking/truelayer/connect`;
  if (!code) {
    const connectingBankId = positiveIntOrNull(query.get('bankId'));
    if (!connectingBankId) {
      return new Response(`bankId must be an integer`, {status: 400});
    }
    const authURL = `https://auth.truelayer.com/?response_type=code&client_id=${process.env.TRUE_LAYER_CLIENT_ID}&scope=accounts%20balance%20transactions%20offline_access&redirect_uri=${redirectURI}&state=${connectingBankId}`;
    return redirect(authURL);
  }
  const bankId = positiveIntOrNull(query.get('state'));
  if (!bankId) {
    return new Response(`bankId must be an integer`, {status: 400});
  }
  let args: Prisma.TrueLayerTokenUncheckedCreateInput | null;
  try {
    const response = await fetch(`https://auth.truelayer.com/connect/token`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        code: code,
        redirect_uri: redirectURI,
        grant_type: 'authorization_code',
        client_id: process.env.TRUE_LAYER_CLIENT_ID,
        client_secret: process.env.TRUE_LAYER_CLIENT_SECRET,
      }),
    });
    const tokenResponse = await response.json();
    const now = new Date();
    args = {
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
  } catch (err) {
    return new Response(`Open banking api error: ${err}`, {status: 500});
  }
  const db = new DB({userId});
  const [existing] = await db.trueLayerTokenFindMany({where: {bankId}});
  if (existing) {
    await prisma.trueLayerToken.update({
      data: args,
      where: {bankId},
    });
    return redirect(DEFAULT_AUTHENTICATED_PAGE);
  }
  await prisma.trueLayerToken.create({
    data: args,
  });
  return redirect(`/config/open-banking/mapping?bankId=${bankId}`);
}
