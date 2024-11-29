'use server';
import {
  SignUpForm,
  signupFormValidationSchema,
} from '@/app/auth/signup/signup-form-schema';
import {assertDefined} from '@/lib/assert';
import {COOKIE_TTL_DAYS, DEFAULT_AUTHENTICATED_PAGE} from '@/lib/auth/const';
import {setSessionTokenCookie} from '@/lib/auth/cookies';
import {createSession, generateSessionToken} from '@/lib/auth/session';
import {getCurrentSession} from '@/lib/auth/user';
import prisma from '@/lib/prisma';
import {logRequest} from '@/lib/util/log';
import {positiveIntOrNull} from '@/lib/util/searchParams';
import {Prisma, User} from '@prisma/client';
import bcrypt from 'bcrypt';
import {addDays} from 'date-fns';
import {redirect} from 'next/navigation';

const genericBadRequest = {
  success: false,
  error: 'Failed to create the user, please try again.',
};

const atCapacityResponse = {
  success: false as const,
  error: 'Maximum number of allowed users reached.',
};

export async function hasCapacityToSignUp(): Promise<boolean> {
  const maxUsers = positiveIntOrNull(
    process.env.MAX_USERS_ALLOWED_TO_REGISTER ?? null
  );
  if (!maxUsers) {
    return false;
  }
  const usersCount = await prisma.user.count();
  return usersCount < maxUsers;
}

export async function signUp(
  unsafeData: SignUpForm
): Promise<{success: true} | {success: false; error: string}> {
  logRequest('signUp');
  // Validate if the user can be created.
  const hasCapacity = await hasCapacityToSignUp();
  if (!hasCapacity) {
    return atCapacityResponse;
  }
  const {user: loggedInUser} = await getCurrentSession();
  if (loggedInUser) {
    return redirect(DEFAULT_AUTHENTICATED_PAGE);
  }
  const parsed = signupFormValidationSchema.safeParse(unsafeData);
  if (!parsed.success) {
    return genericBadRequest;
  }
  const {login, password} = parsed.data;
  // Create the user.
  const rounds = 10 + Math.round(5 * Math.random());
  // This is a heavy operation, make sure to run it outside of the transaction.
  const passwordHash = await bcrypt.hash(password, rounds);
  const txResult = await prisma.$transaction(async tx => {
    const existingUser = await tx.user.findFirst({where: {login}});
    if (existingUser) {
      return {
        user: null,
        error: 'User with this login already exists.',
      };
    }
    const user = await tx.user.create({
      data: {
        login,
        password: passwordHash,
      },
    });
    await createCategories(tx, user, defaultCategories);
    return {user, error: null};
  });
  if (!txResult.user) {
    return {success: false, error: txResult.error};
  }
  const dbUser = txResult.user;
  // User successfully created. Add new session.
  logRequest('signUp', `success by ${login}`);
  const token = generateSessionToken();
  const expiration = addDays(new Date(), COOKIE_TTL_DAYS);
  await createSession(token, dbUser.id, expiration);
  setSessionTokenCookie(token, expiration);
  return {success: true};
}

const defaultCategories = [
  'Groceries > Shops',
  'Groceries > Delivery',
  'Restaurants > Eating out',
  'Restaurants > Delivery',
  'Transport > Public transport',
  'Transport > Taxi',
  'Transport > Car',
  'Utilities > Electricity',
  'Utilities > Water',
  'Utilities > Gas',
  'Utilities > Internet',
  'Utilities > Phone',
  'Utilities > Mobile',
  'Utilities > TV',
  'Housing > Rent',
  'Housing > Mortgage',
  'Housing > Maintenance',
  'Health > Doctor',
  'Health > Pharmacy',
  'Health > Insurance',
  'Entertainment > Cinema',
  'Entertainment > Concert',
  'Entertainment > Theatre',
  'Shopping > Clothes',
  'Shopping > Electronics',
  'Shopping > Furniture',
  'Shopping > Books',
  'Shopping > Gifts',
  'Shopping > Other',
  'Travel > Flights',
  'Travel > Hotels',
  'Travel > Car rental',
  'Travel > Activities',
  'Income > Employment > Salary',
  'Income > Employment > Bonus',
  'Income > Savings > Dividends',
  'Income > Other',
  'Savings > Emergency',
  'Savings > Retirement',
  'Savings > Education',
  'Transfers',
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
  let iid = 1;
  for (let i = 0; i < maxLevel; i++) {
    const names = categoriesByLevel.get(i)!;
    for (const fullName of names) {
      const segments = fullName.split('>').map(s => s.trim());
      const data: Prisma.CategoryUncheckedCreateInput = {
        name: segments[segments.length - 1],
        userId: user.id,
        iid: iid++,
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
