import prisma from "lib/prisma";
import { getUserId } from "lib/user";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest): Promise<Response> {
  const userId = await getUserId();
  // Parse input.
  const { displayCurrencyCode, excludeCategoryIdsInStats } =
    await request.json();
  // Perform update.
  const result = await prisma.displaySettings.update({
    data: {
      displayCurrencyCode,
      excludeCategoryIdsInStats: excludeCategoryIdsInStats.join(","),
    },
    where: { userId },
  });
  return NextResponse.json(result);
}
