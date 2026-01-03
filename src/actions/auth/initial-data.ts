'use server';
import {assertDefined} from '@/lib/assert';
import {USD} from '@/lib/model/Currency';
import {Prisma, User} from '@prisma/client';

export async function createInitialCategories(
  tx: Prisma.TransactionClient,
  user: User
): Promise<void> {
  await createCategories(tx, user, defaultCategories);
}

export async function createInitialDisplaySettings(
  tx: Prisma.TransactionClient,
  user: User
): Promise<void> {
  await tx.displaySettings.create({
    data: {
      displayCurrencyCode: USD.code,
      excludeCategoryIdsInStats: '',
      userId: user.id,
    },
  });
}

const defaultCategories = [
  'Income > Salary',
  'Income > Investment',
  'Income > Other',
  'Housing > Rent & Mortgage',
  'Housing > Utilities',
  'Housing > Services',
  'Food > Groceries',
  'Food > Eating Out',
  'Transport > Public Transport',
  'Transport > Car',
  'Transport > Taxi',
  'Shopping > Clothing',
  'Shopping > Electronics',
  'Shopping > Home',
  'Health & Wellness',
  'Entertainment',
  'Travel',
  'Education',
  'Financial > Taxes',
  'Financial > Fees',
  'Transfer',
];

async function createCategories(
  tx: Prisma.TransactionClient,
  user: User,
  categories: string[]
): Promise<void> {
  // The categories will be inserted into the database starting from the root
  // categories level by level, so each category being created can reference
  // its parent category id.
  // First, go over all the categories which need to be created and assign them
  // to the corresponding levels (root is level zero, subcategory is level 1).
  const categoriesByLevel = new Map<number, string[]>();
  let maxLevel = 0;
  for (const category of categories) {
    const segments = category.split('>').map(s => s.trim());
    for (let i = 0; i < segments.length; i++) {
      if (!categoriesByLevel.has(i)) {
        categoriesByLevel.set(i, []);
      }
      categoriesByLevel.get(i)!.push(segments.slice(0, i + 1).join('>'));
    }
    maxLevel = Math.max(maxLevel, segments.length);
  }
  // Remove all the duplicates on every level because "R > C1" and "R > C2"
  // would come from the previous step as {0: [R, R], 1: [C1, C2]}.
  for (let i = 0; i < maxLevel; i++) {
    const names = categoriesByLevel.get(i)!;
    const uniq = new Set(names);
    categoriesByLevel.set(i, Array.from(uniq));
  }
  // Insert the categories into the database starting from the root ones and
  // advancing level down with every iteration. It is guaranteed to have the
  // necessary parent category id available on the every step.
  const existingCategories = new Map<string, number>();
  for (let i = 0; i < maxLevel; i++) {
    const names = categoriesByLevel.get(i)!;
    for (const fullName of names) {
      const segments = fullName.split('>').map(s => s.trim());
      const data: Prisma.CategoryUncheckedCreateInput = {
        name: segments[segments.length - 1],
        userId: user.id,
      };
      if (segments.length > 1) {
        const parentName = segments.slice(0, segments.length - 1).join('>');
        const parentId = existingCategories.get(parentName);
        assertDefined(parentId);
        data.parentCategoryId = parentId;
      }
      const created = await tx.category.create({data});
      existingCategories.set(fullName, created.id);
    }
  }
}
