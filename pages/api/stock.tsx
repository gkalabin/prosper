import { StockApiModel } from "lib/model/api/BankAccountForm";
import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import type { NextApiRequest, NextApiResponse } from "next";
import yahooFinance from "yahoo-finance2";
import { SearchResult } from "yahoo-finance2/dist/esm/src/modules/search";

// Finds all stocks that match the query.
async function handle(
  userId: number,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const q = req.query.q as string;
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
      })
    )
    .filter((x) => x.exchange && x.ticker);
  res.json(stocks);
}

export default authenticatedApiRoute("GET", handle);
