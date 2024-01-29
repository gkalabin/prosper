import {DB} from 'lib/db';
import {findByCode} from 'lib/model/Currency';
import {DisplaySettingsFormValues} from 'lib/model/api/DisplaySettingsConfig';
import prisma from 'lib/prisma';
import {getUserId} from 'lib/user';
import {NextRequest, NextResponse} from 'next/server';

export async function PUT(request: NextRequest): Promise<Response> {
  const userId = await getUserId();
  const {
    displayCurrencyCode,
    excludeCategoryIdsInStats,
  }: DisplaySettingsFormValues = await request.json();
  const currency = findByCode(displayCurrencyCode);
  if (!currency) {
    return new Response(`Unknown currency ${displayCurrencyCode}`, {
      status: 400,
    });
  }
  const db = new DB({userId});
  const allCategories = await db.categoryFindMany();
  const known = new Set<number>(allCategories.map(c => c.id));
  const unknownCategories = excludeCategoryIdsInStats.filter(known.has);
  if (unknownCategories.length > 0) {
    return new Response(
      `Following categories are not found: ${unknownCategories}`,
      {
        status: 400,
      }
    );
  }
  const result = await prisma.displaySettings.update({
    data: {
      displayCurrencyCode,
      excludeCategoryIdsInStats: excludeCategoryIdsInStats.join(','),
    },
    where: {userId},
  });
  return NextResponse.json(result);
}
