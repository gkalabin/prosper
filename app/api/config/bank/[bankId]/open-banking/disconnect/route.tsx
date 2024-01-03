import {DB} from 'lib/db';
import {deleteToken as deleteTokenNordigen} from 'lib/openbanking/nordigen/token';
import {deleteToken as deleteTokenTrueLayer} from 'lib/openbanking/truelayer/token';
import {getUserId} from 'lib/user';
import {intParam} from 'lib/util/searchParams';
import {RedirectType, redirect} from 'next/navigation';
import {NextRequest} from 'next/server';

export async function POST(
  request: NextRequest,
  {params}: {params: {bankId: string}}
): Promise<Response> {
  const bankId = intParam(params.bankId);
  if (!bankId) {
    return new Response(`bankId must be an integer`, {status: 400});
  }
  const userId = await getUserId();
  const db = new DB({userId});
  const [bank] = await db.bankFindMany({
    where: {
      id: bankId,
    },
  });
  if (!bank) {
    return new Response(`Not authenticated`, {status: 401});
  }
  {
    const [token] = await db.trueLayerTokenFindMany({
      where: {
        bankId,
      },
    });
    if (token) {
      await deleteTokenTrueLayer(db, token);
      return redirect('/config/banks', RedirectType.push);
    }
  }
  {
    const [token] = await db.nordigenTokenFindMany({
      where: {
        bankId,
      },
    });
    const requisition = await db.nordigenRequisitionFindFirst({
      where: {
        bankId,
      },
    });
    if (token && requisition) {
      await deleteTokenNordigen(db, token, requisition);
      return redirect('/config/banks', RedirectType.push);
    }
  }
  {
    const [token] = await db.starlingTokenFindMany({
      where: {
        bankId,
      },
    });
    if (token) {
      await db.starlingTokenDelete({where: {bankId}});
      return redirect('/config/banks', RedirectType.push);
    }
  }
  return new Response(`Bank is not connected`, {status: 400});
}
