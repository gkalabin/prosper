import {
  Bank,
  BankAccount,
  Category,
  DisplaySettings,
  ExchangeRate,
  StockQuote,
  Tag,
  Transaction,
  TransactionType,
  Trip,
  User,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {v4 as uuidv4} from 'uuid';
import {prisma} from '../db';

export const TEST_USER_PASSWORD = 'password123';
export const DEFAULT_TEST_CURRENCY = 'USD';

// Bundle of test data suitable for most tests.
export type TestDataBundle = {
  user: Awaited<ReturnType<TestFactory['createUser']>>;
  bank: Bank;
  account: BankAccount;
  category: Category;
};

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

  // Cleans up global entities that are NOT user-specific.
  // Runs as a part of global teardown.
  static async globalCleanUp() {
    console.log('Running global cleanup...');
    try {
      await prisma.stockQuote.deleteMany();
      await prisma.stock.deleteMany();
      await prisma.exchangeRate.deleteMany();
    } catch (error) {
      console.error('Failed to run global cleanup:', error);
    }
  }

  async createUserWithTestData(overrides?: {
    user?: Partial<User & {rawPassword: string}>;
    bank?: Partial<Bank>;
    account?: Partial<BankAccount>;
    category?: Partial<Category>;
  }): Promise<TestDataBundle> {
    const user = await this.createUser(overrides?.user);
    const bank = await this.createBank(user.id, overrides?.bank);
    const account = await this.createAccount(
      user.id,
      bank.id,
      overrides?.account
    );
    const category = await this.createCategory(user.id, overrides?.category);
    return {user, bank, account, category};
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

  async createStock({
    name,
    ticker,
    exchange,
    currencyCode,
  }: {
    name: string;
    ticker: string;
    exchange: string;
    currencyCode: string;
  }) {
    return prisma.stock.create({
      data: {
        name,
        ticker,
        exchange,
        currencyCode,
      },
    });
  }

  async createStockQuote(
    stockId: number,
    price: number,
    overrides?: Partial<StockQuote>
  ) {
    return prisma.stockQuote.create({
      data: {
        stockId,
        quoteTimestamp: new Date(),
        value: price,
        ...overrides,
      },
    });
  }

  // Helper method to create a stock account (account linked to a stock instead of currency)
  async createStockAccount(
    userId: number,
    bankId: number,
    stockId: number,
    overrides?: Partial<BankAccount>
  ) {
    return prisma.bankAccount.create({
      data: {
        userId,
        bankId,
        name: `Stock Account`,
        stockId,
        // Stock accounts don't have currencyCode; the stock has the currency
        currencyCode: null,
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

  async createTransfer(
    userId: number,
    fromAccountId: number,
    toAccountId: number,
    categoryId: number,
    amount: number,
    receivedAmount?: number,
    overrides?: Partial<Transaction>
  ) {
    return prisma.transaction.create({
      data: {
        userId,
        transactionType: TransactionType.TRANSFER,
        outgoingAccountId: fromAccountId,
        outgoingAmountCents: Math.round(amount * 100),
        incomingAccountId: toAccountId,
        incomingAmountCents: Math.round((receivedAmount ?? amount) * 100),
        ownShareAmountCents: 0,
        timestamp: new Date(),
        categoryId,
        description: '',
        ...overrides,
      },
    });
  }

  async createExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    rate: number,
    overrides?: Partial<ExchangeRate>
  ) {
    const NANOS_MULTIPLIER = 1000000000;
    return prisma.exchangeRate.create({
      data: {
        currencyCodeFrom: fromCurrency,
        currencyCodeTo: toCurrency,
        rateNanos: BigInt(Math.round(rate * NANOS_MULTIPLIER)),
        rateTimestamp: new Date(),
        ...overrides,
      },
    });
  }

  async updateDisplaySettings(
    userId: number,
    updates: Partial<DisplaySettings>
  ) {
    return prisma.displaySettings.update({
      where: {userId},
      data: updates,
    });
  }

  async createThirdPartyExpense(
    userId: number,
    categoryId: number,
    amount: number,
    vendor: string,
    payer: string,
    currencyCode: string = DEFAULT_TEST_CURRENCY,
    overrides?: Partial<Transaction>
  ) {
    return prisma.transaction.create({
      data: {
        userId,
        transactionType: TransactionType.THIRD_PARTY_EXPENSE,
        outgoingAmountCents: Math.round(amount * 100),
        ownShareAmountCents: Math.round(amount * 100),
        timestamp: new Date(),
        categoryId,
        description: '',
        vendor,
        payer,
        currencyCode,
        ...overrides,
      },
    });
  }

  async createTransactionLink(
    sourceTransactionId: number,
    linkedTransactionId: number,
    linkType: 'REFUND' | 'DEBT_SETTLING'
  ) {
    return prisma.transactionLink.create({
      data: {
        sourceTransactionId,
        linkedTransactionId,
        linkType,
      },
    });
  }
}
