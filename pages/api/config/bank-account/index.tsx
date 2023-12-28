import { Prisma } from "@prisma/client";
import {
  CreateBankAccountRequest,
  UnitApiModel,
} from "lib/model/api/BankAccountForm";
import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import { Currency } from "lib/model/Currency";
import prisma from "lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import yahooFinance from "yahoo-finance2";
import { Quote } from "yahoo-finance2/dist/esm/src/modules/quote";

async function handle(
  userId: number,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { name, displayOrder, bankId, unit, isJoint, initialBalance } =
    req.body as CreateBankAccountRequest;
  const data: Prisma.BankAccountUncheckedCreateInput = {
    name,
    displayOrder,
    bankId,
    userId,
    joint: isJoint,
    initialBalanceCents: Math.round(initialBalance * 100),
  };
  await fillUnitData(unit, data);
  const result = await prisma.bankAccount.create({
    data: data,
  });
  res.json(result);
}

export default authenticatedApiRoute("POST", handle);

export async function fillUnitData(
  unit: UnitApiModel,
  data:
    | Prisma.BankAccountUncheckedCreateInput
    | Prisma.BankAccountUncheckedUpdateInput
): Promise<void> {
  if (unit.kind === "currency") {
    data.currencyCode = unit.currencyCode;
    return;
  }
  if (unit.kind !== "stock") {
    throw new Error("Unknown unit kind: " + unit);
  }
  const existingStock = await prisma.stock.findFirst({
    where: {
      exchange: unit.exchange,
      ticker: unit.ticker,
    },
  });
  if (existingStock) {
    data.stockId = existingStock.id;
    return;
  }
  const quote: Quote = await yahooFinance.quote(unit.ticker);
  if (!quote) {
    throw new Error("Could not find stock: " + unit.ticker);
  }
  const currency = Currency.findByCode(quote.currency);
  if (!currency) {
    console.error("Could not find currency", quote.currency, quote);
    throw new Error(
      `Could not find currency '${quote.currency}' when creating stock ${unit.ticker}`
    );
  }
  const newStock = await prisma.stock.create({
    data: {
      exchange: quote.exchange,
      ticker: quote.symbol,
      currencyCode: quote.currency,
      name: quote.longName ?? quote.shortName,
    },
  });
  data.stockId = newStock.id;
}
