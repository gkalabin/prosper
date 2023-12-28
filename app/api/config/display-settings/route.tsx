import prisma from "lib/prisma";
import { getUserId } from "lib/user";

export async function PUT(request: Request): Promise<Response> {
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
  return Response.json(result);
}
