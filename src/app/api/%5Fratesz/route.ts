import {REFRESH_INTERVAL_HOURS} from '@/lib/asset-rates/backfill';
import {addLatestExchangeRates} from '@/lib/asset-rates/currency-rates';
import {addLatestStockQuotes} from '@/lib/asset-rates/stock-quotes';
import {logRequest} from '@/lib/util/log';
import {NextRequest, NextResponse} from 'next/server';

// To prohibit access from the outside using nginx, add the following to the config:
//   server {
//     ...
//
//     location /api/_ratesz {
//         deny all;
//     }
//
//     location / {
//         ...
//     }
//   }

const FORBIDDEN = new NextResponse(null, {status: 401});
const OK = new NextResponse('OK', {status: 200});

export async function POST(req: NextRequest) {
  logRequest('_ratesz');
  const expectedSecret = process.env.ADMIN_HANDLER_SECRET;
  if (!expectedSecret) {
    console.warn('No ADMIN_HANDLER_SECRET env, exiting');
    return FORBIDDEN;
  }
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${expectedSecret}`) {
    return FORBIDDEN;
  }
  try {
    await Promise.all([
      await addLatestExchangeRates(REFRESH_INTERVAL_HOURS),
      await addLatestStockQuotes(REFRESH_INTERVAL_HOURS),
    ]);
    return OK;
  } catch (error) {
    console.error('Error updating asset rates', error);
    return new NextResponse(null, {status: 500});
  }
}
