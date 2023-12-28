import { DispalySettingsFormValues } from "lib/model/api/DisplaySettingsConfig";
import prisma from "lib/prisma";
import { getUserId } from "lib/user";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest): Promise<Response> {
  const userId = await getUserId();
  // TODO: validate that the currency code is valid and category ids belong to the user.
  const {
    displayCurrencyCode,
    excludeCategoryIdsInStats,
  }: DispalySettingsFormValues = await request.json();
  const result = await prisma.displaySettings.update({
    data: {
      displayCurrencyCode,
      excludeCategoryIdsInStats: excludeCategoryIdsInStats.join(","),
    },
    where: { userId },
  });
  return NextResponse.json(result);
}
