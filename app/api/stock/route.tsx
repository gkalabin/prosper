import { StockApiModel } from "lib/model/api/BankAccountForm";
import { getUserId } from "lib/user";
import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";
import { SearchResult } from "yahoo-finance2/dist/esm/src/modules/search";

export async function GET(request: NextRequest): Promise<Response> {
  // Make sure the user is authenticated.
  await getUserId();
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q");
  const found: SearchResult = await yahooFinance.search(q, { newsCount: 0 });
  const stocks: StockApiModel[] = found.quotes
    // Remove currencies as there is an internal list of currencies in the Currency class.
    .filter((x) => x.quoteType !== "CURRENCY")
    .map(
      (x): StockApiModel => ({
        kind: "stock",
        exchange: x.exchange,
        ticker: x.symbol,
        name: x.shortname ?? x.longname ?? x.typeDisp,
      }),
    )
    .filter((x) => x.exchange && x.ticker);
  return NextResponse.json(stocks);
}
