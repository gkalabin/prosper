import {getUserIdOrRedirect} from '@/lib/auth/user';
import {
  CurrencyUnitSchema,
  StockUnitSchema,
  UnitSchema,
} from '@/lib/form-types/AccountFormSchema';
import {allCurrencies} from '@/lib/model/Currency';
import {NextRequest, NextResponse} from 'next/server';
import yahooFinance from 'yahoo-finance2';
import {type SearchResult} from 'yahoo-finance2/dist/esm/src/modules/search';

export async function GET(request: NextRequest): Promise<Response> {
  // Make sure the user is authenticated.
  await getUserIdOrRedirect();
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q');
  if (!q) {
    return new Response(`query 'q' cannot be empty`, {status: 400});
  }
  const found: SearchResult = await yahooFinance.search(q, {newsCount: 0});
  const stocks: StockUnitSchema[] = found.quotes
    .filter(x => x.isYahooFinance)
    // Remove currencies as there is an internal list of currencies in the Currency class.
    .filter(x => x.quoteType !== 'CURRENCY')
    .map(
      (x): StockUnitSchema => ({
        kind: 'stock',
        exchange: x.exchange,
        ticker: x.symbol,
        name: x.shortname ?? x.longname ?? x.typeDisp,
      })
    )
    .filter(x => x.exchange && x.ticker);

  const currencies: CurrencyUnitSchema[] = allCurrencies()
    .filter(c => c.code.toLowerCase().includes(q.toLowerCase()))
    .map(c => ({
      kind: 'currency',
      currencyCode: c.code,
    }));
  const response: UnitSchema[] = [...stocks, ...currencies];
  return NextResponse.json(response);
}
