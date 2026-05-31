import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {
  CurrencyUnitSchema,
  StockUnitSchema,
  UnitSchema,
} from '@/lib/form-types/AccountFormSchema';
import {withAuth} from '@/lib/grpc/auth';
import {ratesClient} from '@/lib/grpc/client';
import {allCurrencies} from '@/lib/model/Currency';
import {logApi} from '@/lib/util/log';
import {NextRequest, NextResponse} from 'next/server';

export async function GET(request: NextRequest): Promise<Response> {
  const auth = await getAuthContextOrRedirect();
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q');
  logApi('GET', '/api/stock', {userId: auth.userId, q: q ?? ''});
  if (!q) {
    return new Response(`query 'q' cannot be empty`, {status: 400});
  }
  const {response} = await ratesClient.searchStocks(withAuth({query: q}, auth));
  const stocks: StockUnitSchema[] = response.stocks.map(
    (x): StockUnitSchema => ({
      kind: 'stock',
      exchange: x.exchange,
      ticker: x.ticker,
      name: x.name,
      currencyCode: x.currencyCode,
      pricePerShareNanos: Number(x.pricePerShareNanos),
    })
  );
  const currencies: CurrencyUnitSchema[] = allCurrencies()
    .filter(c => c.code.toLowerCase().includes(q.toLowerCase()))
    .map(c => ({kind: 'currency', currencyCode: c.code}));
  const units: UnitSchema[] = [...stocks, ...currencies];
  return NextResponse.json(units);
}
