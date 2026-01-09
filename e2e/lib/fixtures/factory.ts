import {
  Bank,
  BankAccount,
  Category,
  Tag,
  Transaction,
  TransactionType,
  User,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {v4 as uuidv4} from 'uuid';
import {prisma} from '../db';

export const TEST_USER_PASSWORD = 'password123';
export const DEFAULT_TEST_CURRENCY = 'USD';

export class TestFactory {
  private createdUsers: string[] = [];

  registerUserForCleanup(login: string) {
    this.createdUsers.push(login);
  }

  async cleanUp() {
    console.log('Cleaning up users', this.createdUsers);
    if (this.createdUsers.length === 0) {
      return;
    }
    const whereLogin = {
      where: {login: {in: this.createdUsers}},
    };
    try {
      const userIds = await prisma.user
        .findMany(whereLogin)
        .then(u => u.map(({id}) => id));
      const whereUserId = {where: {userId: {in: userIds}}};
      const transactionsIds = await prisma.transaction
        .findMany(whereUserId)
        .then(t => t.map(({id}) => id));
      await prisma.transactionLink.deleteMany({
        where: {
          OR: [
            {sourceTransactionId: {in: transactionsIds}},
            {linkedTransactionId: {in: transactionsIds}},
          ],
        },
      });
      await prisma.transaction.deleteMany({where: {id: {in: transactionsIds}}});
      await prisma.bankAccount.deleteMany(whereUserId);
      await prisma.bank.deleteMany(whereUserId);
      await prisma.category.deleteMany(whereUserId);
      await prisma.tag.deleteMany(whereUserId);
      await prisma.transactionPrototype.deleteMany(whereUserId);
      await prisma.trip.deleteMany(whereUserId);
      await prisma.displaySettings.deleteMany(whereUserId);
      await prisma.externalAccountMapping.deleteMany(whereUserId);
      await prisma.trueLayerToken.deleteMany(whereUserId);
      await prisma.nordigenToken.deleteMany(whereUserId);
      await prisma.nordigenRequisition.deleteMany(whereUserId);
      await prisma.starlingToken.deleteMany(whereUserId);
      await prisma.session.deleteMany(whereUserId);
      await prisma.user.deleteMany(whereLogin);
    } catch (error) {
      console.error('Failed to cleanup test data:', error);
    }
  }

  async createUser(overrides?: Partial<User & {rawPassword: string}>) {
    const login = 'e2e_test_user_' + uuidv4().slice(0, 8);
    const rawPassword = overrides?.rawPassword || TEST_USER_PASSWORD;
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const user = await prisma.user.create({
      data: {
        login,
        password: passwordHash,
        ...overrides,
      },
    });
    await prisma.displaySettings.create({
      data: {
        userId: user.id,
        displayCurrencyCode: DEFAULT_TEST_CURRENCY,
        excludeCategoryIdsInStats: '',
      },
    });
    this.createdUsers.push(login);
    return {...user, rawPassword};
  }

  async createBank(userId: number, overrides?: Partial<Bank>) {
    return prisma.bank.create({
      data: {
        userId,
        name: `Test Bank`,
        ...overrides,
      },
    });
  }

  async createAccount(
    userId: number,
    bankId: number,
    overrides?: Partial<BankAccount>
  ) {
    return prisma.bankAccount.create({
      data: {
        userId,
        bankId,
        name: `Test Account`,
        currencyCode: DEFAULT_TEST_CURRENCY,
        ...overrides,
      },
    });
  }

  async createCategory(userId: number, overrides?: Partial<Category>) {
    return prisma.category.create({
      data: {
        userId,
        name: `Test Category`,
        ...overrides,
      },
    });
  }

  async createTag(userId: number, name: string, overrides?: Partial<Tag>) {
    return prisma.tag.create({
      data: {
        userId,
        name,
        ...overrides,
      },
    });
  }

  async createExpense(
    userId: number,
    accountId: number,
    categoryId: number,
    amount: number,
    vendor: string,
    overrides?: Partial<Transaction>,
    tagIds?: number[]
  ) {
    return prisma.transaction.create({
      data: {
        userId,
        transactionType: TransactionType.PERSONAL_EXPENSE,
        outgoingAccountId: accountId,
        outgoingAmountCents: Math.round(amount * 100),
        ownShareAmountCents: Math.round(amount * 100),
        timestamp: new Date(),
        categoryId,
        description: '',
        vendor,
        ...overrides,
        tags: tagIds ? {connect: tagIds.map(id => ({id}))} : undefined,
      },
    });
  }

  async createIncome(
    userId: number,
    accountId: number,
    categoryId: number,
    amount: number,
    payer: string,
    overrides?: Partial<Transaction>
  ) {
    return prisma.transaction.create({
      data: {
        userId,
        transactionType: TransactionType.INCOME,
        incomingAccountId: accountId,
        incomingAmountCents: Math.round(amount * 100),
        ownShareAmountCents: Math.round(amount * 100),
        timestamp: new Date(),
        categoryId,
        description: '',
        payer,
        ...overrides,
      },
    });
  }
}
