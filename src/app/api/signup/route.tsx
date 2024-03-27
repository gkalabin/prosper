import {authOptions} from '@/app/api/auth/[...nextauth]/authOptions';
import {assertDefined} from '@/lib/assert';
import {
  SignUpForm,
  SignUpResponse,
  signupFormValidationSchema,
} from '@/lib/model/signup-form';
import prisma from '@/lib/prisma';
import {positiveIntOrNull} from '@/lib/util/searchParams';
import {Prisma, User} from '@prisma/client';
import bcrypt from 'bcrypt';
import {getServerSession} from 'next-auth/next';
import {redirect} from 'next/navigation';
import {NextRequest} from 'next/server';

const genericBadRequest: SignUpResponse = {
  success: false,
  name: 'root',
  message: 'Failed to create the user, please try again.',
};

const atCapacityResponse: SignUpResponse = {
  success: false,
  name: 'root',
  message: 'Maximum number of allowed users reached.',
};

let atCapacity = false;

export async function POST(request: NextRequest): Promise<Response> {
  if (atCapacity) {
    return new Response(JSON.stringify(atCapacityResponse), {
      status: 403,
    });
  }
  const maxUsers = positiveIntOrNull(
    process.env.MAX_USERS_ALLOWED_TO_REGISTER ?? null
  );
  if (!maxUsers) {
    return new Response(JSON.stringify(atCapacityResponse), {
      status: 403,
    });
  }
  const usersCount = await prisma.user.count();
  if (usersCount >= maxUsers) {
    atCapacity = true;
    return new Response(JSON.stringify(atCapacityResponse), {
      status: 403,
    });
  }
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    return redirect('/overview');
  }
  // Parse and validate the request.
  let form: SignUpForm | null = null;
  try {
    const json = await request.json();
    const parsed = signupFormValidationSchema.safeParse(json);
    if (!parsed.success) {
      // TODO: return the validation result to the client, so it can display
      // the error messages in the form.
      return new Response(JSON.stringify(genericBadRequest), {
        status: 400,
      });
    }
    form = parsed.data;
  } catch (e) {
    return new Response(JSON.stringify(genericBadRequest), {
      status: 400,
    });
  }
  // Create the user.
  const rounds = 10 + Math.round(5 * Math.random());
  // This is a heavy operation, make sure to run it outside of the transaction.
  const hash = await bcrypt.hash(form.password, rounds);
  const {
    statusCode,
    response,
  }: {statusCode: 200 | 400; response: SignUpResponse} =
    await prisma.$transaction(async tx => {
      assertDefined(form);
      const existingUser = await tx.user.findFirst({
        where: {
          login: form.login,
        },
      });
      if (existingUser) {
        return {
          statusCode: 400,
          response: {
            success: false,
            name: 'login',
            message: 'User with this login already exists.',
          },
        };
      }
      const user = await tx.user.create({
        data: {
          login: form.login,
          password: hash,
        },
      });
      await createCategories(tx, user, defaultCategories);
      return {
        statusCode: 200,
        response: {
          success: true,
        },
      };
    });
  return new Response(JSON.stringify(response), {
    status: statusCode,
  });
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
