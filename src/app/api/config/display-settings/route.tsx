import {displaySettingsFormValidationSchema} from '@/lib/form-types/DisplaySettingsFormSchema';
import {DB} from '@/lib/db';
import {findByCode} from '@/lib/model/Currency';
import prisma from '@/lib/prisma';
import {getUserId} from '@/lib/user';
import {NextRequest, NextResponse} from 'next/server';

export async function PUT(request: NextRequest): Promise<Response> {
  const userId = await getUserId();
  const validatedData = displaySettingsFormValidationSchema.safeParse(
    await request.json()
  );
  if (!validatedData.success) {
    return new Response(`Invalid form`, {
      status: 400,
    });
  }
  const {displayCurrencyCode, excludeCategoryIdsInStats} = validatedData.data;
  const currency = findByCode(displayCurrencyCode);
  if (!currency) {
    return new Response(`Unknown currency ${displayCurrencyCode}`, {
      status: 400,
    });
  }
  const db = new DB({userId});
  const allCategories = await db.categoryFindMany();
  const known = new Set<number>(allCategories.map(c => c.id));
  const unknownCategories = excludeCategoryIdsInStats.filter(
    id => !known.has(id)
  );
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
