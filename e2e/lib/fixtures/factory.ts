import {
  Bank,
  BankAccount,
  Category,
  DisplaySettings,
  ExchangeRate,
  StockQuote,
  Tag,
  User,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {v4 as uuidv4} from 'uuid';
import {prisma} from '../db';

export const TEST_USER_PASSWORD = 'password123';
export const DEFAULT_TEST_CURRENCY = 'USD';
const NANOS_PER_DOLLAR = 1_000_000_000;

type UserWithRawPassword = User & {rawPassword: string};

// Bundle of test data suitable for most tests.
export type TestDataBundle = {
  user: UserWithRawPassword;
  bank: Bank;
  account: BankAccount;
  category: Category;
};

// Provides the IDs needed by all transaction factory methods.
// Accepts both full entity objects (from TestDataBundle) and raw IDs.
type TransactionContext = {
  user: {id: number};
  account: {id: number};
  category: {id: number};
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
      await prisma.splitContext.deleteMany({
        where: {transactionId: {in: transactionsIds}},
      });
      await prisma.entryLine.deleteMany({
        where: {transactionId: {in: transactionsIds}},
      });
      await prisma.transactionPrototype.deleteMany({
        where: {internalTransactionId: {in: transactionsIds}},
      });
      await prisma.transaction.deleteMany({
        where: {id: {in: transactionsIds}},
      });
      await prisma.bankAccount.deleteMany(whereUserId);
      await prisma.ledgerAccount.deleteMany(whereUserId);
      await prisma.bank.deleteMany(whereUserId);
      await prisma.category.deleteMany(whereUserId);
      await prisma.tag.deleteMany(whereUserId);
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

  async createUserWithMultipleAccounts(overrides?: {
    user?: Partial<User & {rawPassword: string}>;
    bank?: Partial<Bank>;
    accounts: Array<Partial<BankAccount> & {initialBalance?: number}>;
    category?: Partial<Category>;
  }) {
    const user = await this.createUser(overrides?.user);
    const bank = await this.createBank(user.id, overrides?.bank);
    const accounts: BankAccount[] = [];
    for (const a of overrides?.accounts || []) {
      const createdAccount = await this.createAccount(user.id, bank.id, a);
      accounts.push(createdAccount);
    }
    const category = await this.createCategory(user.id, overrides?.category);
    return {user, bank, accounts, category};
  }

  async createUserWithTestData(overrides?: {
    user?: Partial<User & {rawPassword: string}>;
    bank?: Partial<Bank>;
    account?: Partial<BankAccount> & {initialBalance?: number};
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

  private iidCounterByUser: Record<number, number> = {};
  private async nextIid(userId: number): Promise<number> {
    if (this.iidCounterByUser[userId] === undefined) {
      this.iidCounterByUser[userId] = 1;
    }
    return this.iidCounterByUser[userId]++;
  }

  async createUser(overrides?: Partial<UserWithRawPassword>) {
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
    const systemTypes = [
      'EXPENSE',
      'INCOME',
      'EQUITY',
      'CURRENCY_EXCHANGE',
    ] as const;
    await prisma.ledgerAccount.createMany({
      data: systemTypes.map(type => ({
        userId: user.id,
        name: `SYSTEM:${type}`,
        type,
      })),
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
    overrides?: Partial<BankAccount> & {initialBalance?: number}
  ) {
    // Do not set default currencyCode for stock accounts.
    const currencyCode = overrides?.stockId ? undefined : DEFAULT_TEST_CURRENCY;
    const {initialBalance, ...restOverrides} = overrides || {};
    const account = await prisma.bankAccount.create({
      data: {
        userId,
        bankId,
        name: `Test Account`,
        currencyCode,
        ...restOverrides,
      },
    });
    await prisma.ledgerAccount.create({
      data: {
        userId,
        name: account.name,
        type: 'ASSET',
        bankAccountId: account.id,
      },
    });
    if (overrides?.initialBalance) {
      await this.openingBalance({
        userId,
        bankAccountId: account.id,
        initialBalance: overrides.initialBalance,
        currencyCode,
      });
    }
    return account;
  }

  private async openingBalance({
    userId,
    bankAccountId,
    initialBalance,
    currencyCode,
    stockId,
    timestamp,
  }: {
    userId: number;
    bankAccountId: number;
    initialBalance: number;
    currencyCode?: string | null;
    stockId?: number | null;
    timestamp?: Date | string;
  }) {
    const amountNanos = BigInt(Math.round(initialBalance * NANOS_PER_DOLLAR));
    const ledgerAccount = await prisma.ledgerAccount.findFirstOrThrow({
      where: {userId, bankAccountId, type: 'ASSET'},
    });
    const equityAccount = await prisma.ledgerAccount.findFirstOrThrow({
      where: {userId, type: 'EQUITY'},
    });
    const iid = await this.nextIid(userId);
    const time = timestamp ? new Date(timestamp) : new Date();
    return prisma.transaction.create({
      data: {
        iid,
        userId,
        timestamp: time,
        type: 'OPENING_BALANCE',
        lines: {
          create: [
            {
              ledgerAccountId: ledgerAccount.id,
              amountNanos,
              currencyCode,
              stockId,
            },
            {
              ledgerAccountId: equityAccount.id,
              amountNanos: -amountNanos,
              currencyCode,
              stockId,
            },
          ],
        },
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

  async getOrCreateReceivableAccount(userId: number, companionName: string) {
    const name = `RECEIVABLE:${companionName}`;
    let ledgerAccountReceivable = await prisma.ledgerAccount.findFirst({
      where: {userId, type: 'RECEIVABLE', name},
    });
    if (!ledgerAccountReceivable) {
      ledgerAccountReceivable = await prisma.ledgerAccount.create({
        data: {userId, name, type: 'RECEIVABLE'},
      });
    }
    return ledgerAccountReceivable;
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

  async expense(
    vendor: string,
    amount: number,
    {
      user,
      account,
      category,
      timestamp,
      description,
      tagIds,
      ownShareAmount,
      otherPartyName,
      bank: _bank,
      ...overrides
    }: TransactionContext & {
      bank?: unknown;
      timestamp?: Date | string;
      description?: string;
      tagIds?: number[];
      ownShareAmount?: number;
      otherPartyName?: string;
      tripId?: number;
    }
  ) {
    const amountNanos = BigInt(amount * NANOS_PER_DOLLAR);
    const ownShareAmountNanos = ownShareAmount
      ? BigInt(ownShareAmount * NANOS_PER_DOLLAR)
      : amountNanos;
    const time = timestamp ? new Date(timestamp) : new Date();
    const iid = await this.nextIid(user.id);
    const bankAccount = await prisma.bankAccount.findUniqueOrThrow({
      where: {id: account.id},
    });
    const ledgerAccountAsset = await prisma.ledgerAccount.findUniqueOrThrow({
      where: {bankAccountId: account.id},
    });
    const ledgerAccountExpense = await prisma.ledgerAccount.findFirstOrThrow({
      where: {userId: user.id, type: 'EXPENSE'},
    });
    const currencyCode = bankAccount.currencyCode ?? undefined;
    const stockId = bankAccount.stockId ?? undefined;
    const lines = [
      {
        ledgerAccountId: ledgerAccountAsset.id,
        amountNanos: -amountNanos,
        currencyCode,
        stockId,
      },
      {
        ledgerAccountId: ledgerAccountExpense.id,
        amountNanos: ownShareAmountNanos,
        currencyCode,
        stockId,
      },
    ];
    let splits;
    if (otherPartyName) {
      const companionShareNanos = amountNanos - ownShareAmountNanos;
      const ledgerAccountReceivable = await this.getOrCreateReceivableAccount(
        user.id,
        otherPartyName
      );
      lines.push({
        ledgerAccountId: ledgerAccountReceivable.id,
        amountNanos: companionShareNanos,
        currencyCode,
        stockId,
      });
      splits = {
        create: [
          {
            companionName: otherPartyName,
            companionShareNanos,
            companionPaidNanos: BigInt(0),
          },
        ],
      };
    }
    return prisma.transaction.create({
      data: {
        iid,
        userId: user.id,
        type: 'EXPENSE',
        timestamp: time,
        categoryId: category.id,
        note: description ?? '',
        vendor,
        lines: {create: lines},
        ...(overrides.tripId ? {tripId: overrides.tripId} : {}),
        ...(splits ? {splits} : {}),
        ...(tagIds ? {tags: {connect: tagIds.map(id => ({id}))}} : {}),
      },
    });
  }

  async income(
    payer: string,
    amount: number,
    {
      user,
      account,
      category,
      timestamp,
      description,
      tagIds,
      ownShareAmount,
      otherPartyName,
      bank: _bank,
      ...overrides
    }: TransactionContext & {
      bank?: unknown;
      timestamp?: Date | string;
      description?: string;
      tagIds?: number[];
      ownShareAmount?: number;
      otherPartyName?: string;
      tripId?: number;
    }
  ) {
    const amountNanos = BigInt(amount * NANOS_PER_DOLLAR);
    const ownShareAmountNanos = ownShareAmount
      ? BigInt(ownShareAmount * NANOS_PER_DOLLAR)
      : amountNanos;
    const time = timestamp ? new Date(timestamp) : new Date();
    const iid = await this.nextIid(user.id);
    const bankAccount = await prisma.bankAccount.findUniqueOrThrow({
      where: {id: account.id},
    });
    const ledgerAccountAsset = await prisma.ledgerAccount.findUniqueOrThrow({
      where: {bankAccountId: account.id},
    });
    const ledgerAccountIncome = await prisma.ledgerAccount.findFirstOrThrow({
      where: {userId: user.id, type: 'INCOME'},
    });
    const currencyCode = bankAccount.currencyCode ?? undefined;
    const stockId = bankAccount.stockId ?? undefined;
    const lines = [
      {
        ledgerAccountId: ledgerAccountAsset.id,
        currencyCode,
        stockId,
        amountNanos: amountNanos,
      },
      {
        ledgerAccountId: ledgerAccountIncome.id,
        currencyCode,
        stockId,
        amountNanos: -ownShareAmountNanos,
      },
    ];
    let splits;
    if (otherPartyName) {
      const companionShareNanos = amountNanos - ownShareAmountNanos;
      const ledgerAccountReceivable = await this.getOrCreateReceivableAccount(
        user.id,
        otherPartyName
      );
      lines.push({
        ledgerAccountId: ledgerAccountReceivable.id,
        currencyCode,
        stockId,
        amountNanos: -companionShareNanos,
      });
      splits = {
        create: [
          {
            companionName: otherPartyName,
            companionShareNanos,
            companionPaidNanos: BigInt(0),
          },
        ],
      };
    }
    return prisma.transaction.create({
      data: {
        iid,
        userId: user.id,
        type: 'INCOME',
        timestamp: time,
        categoryId: category.id,
        note: description ?? '',
        payer,
        lines: {create: lines},
        ...(overrides.tripId ? {tripId: overrides.tripId} : {}),
        ...(splits ? {splits} : {}),
        ...(tagIds ? {tags: {connect: tagIds.map(id => ({id}))}} : {}),
      },
    });
  }

  async transfer(
    amount: number,
    {
      user,
      from,
      to,
      category,
      timestamp,
      description,
      tagIds,
      receivedAmount,
      bank: _bank,
      account: _account,
      ...overrides
    }: {
      user: {id: number};
      from: {id: number};
      to: {id: number};
      category: {id: number};
      bank?: unknown;
      account?: unknown;
      timestamp?: Date | string;
      description?: string;
      tagIds?: number[];
      receivedAmount?: number;
      tripId?: number;
    }
  ) {
    const amountNanos = BigInt(amount * NANOS_PER_DOLLAR);
    const receivedAmountNanos = receivedAmount
      ? BigInt(receivedAmount * NANOS_PER_DOLLAR)
      : amountNanos;
    const time = timestamp ? new Date(timestamp) : new Date();
    const iid = await this.nextIid(user.id);
    const fromBankAcct = await prisma.bankAccount.findUniqueOrThrow({
      where: {id: from.id},
    });
    const toBankAcct = await prisma.bankAccount.findUniqueOrThrow({
      where: {id: to.id},
    });
    const ledgerAccountFromAsset = await prisma.ledgerAccount.findUniqueOrThrow(
      {
        where: {bankAccountId: from.id},
      }
    );
    const ledgerAccountToAsset = await prisma.ledgerAccount.findUniqueOrThrow({
      where: {bankAccountId: to.id},
    });
    const lines = [
      {
        ledgerAccountId: ledgerAccountFromAsset.id,
        amountNanos: -amountNanos,
        currencyCode: fromBankAcct.currencyCode,
        stockId: fromBankAcct.stockId,
      },
      {
        ledgerAccountId: ledgerAccountToAsset.id,
        amountNanos: receivedAmountNanos,
        currencyCode: toBankAcct.currencyCode,
        stockId: toBankAcct.stockId,
      },
    ];
    if (
      fromBankAcct.currencyCode !== toBankAcct.currencyCode ||
      fromBankAcct.stockId !== toBankAcct.stockId
    ) {
      const ledgerAccountExchange = await prisma.ledgerAccount.findFirstOrThrow(
        {
          where: {userId: user.id, type: 'CURRENCY_EXCHANGE'},
        }
      );
      lines.push(
        {
          ledgerAccountId: ledgerAccountExchange.id,
          amountNanos: amountNanos,
          currencyCode: fromBankAcct.currencyCode,
          stockId: fromBankAcct.stockId,
        },
        {
          ledgerAccountId: ledgerAccountExchange.id,
          amountNanos: -receivedAmountNanos,
          currencyCode: toBankAcct.currencyCode,
          stockId: toBankAcct.stockId,
        }
      );
    }
    return prisma.transaction.create({
      data: {
        iid,
        userId: user.id,
        type: 'TRANSFER',
        timestamp: time,
        categoryId: category.id,
        note: description ?? '',
        lines: {create: lines},
        ...(overrides.tripId ? {tripId: overrides.tripId} : {}),
        ...(tagIds ? {tags: {connect: tagIds.map(id => ({id}))}} : {}),
      },
    });
  }

  async thirdPartyExpense({
    user,
    category,
    vendor,
    payer,
    fullAmount,
    ownShareAmount,
    currencyCode,
    timestamp,
    tagIds,
    bank: _bank,
    account: _account,
    ...overrides
  }: {
    user: {id: number};
    category: {id: number};
    vendor: string;
    payer: string;
    fullAmount: number;
    ownShareAmount: number;
    currencyCode: string;
    timestamp?: Date | string;
    bank?: unknown;
    account?: unknown;
    tagIds?: number[];
    tripId?: number;
  }) {
    const fullAmountNanos = BigInt(fullAmount * NANOS_PER_DOLLAR);
    const ownShareAmountNanos = BigInt(ownShareAmount * NANOS_PER_DOLLAR);
    const time = timestamp ? new Date(timestamp) : new Date();
    const iid = await this.nextIid(user.id);
    const ledgerAccountExpense = await prisma.ledgerAccount.findFirstOrThrow({
      where: {userId: user.id, type: 'EXPENSE'},
    });
    const ledgerAccountReceivable = await this.getOrCreateReceivableAccount(
      user.id,
      payer
    );
    const lines = [
      {
        ledgerAccountId: ledgerAccountExpense.id,
        amountNanos: ownShareAmountNanos,
        currencyCode,
        stockId: undefined,
      },
      {
        ledgerAccountId: ledgerAccountReceivable.id,
        amountNanos: -ownShareAmountNanos,
        currencyCode,
        stockId: undefined,
      },
    ];
    return prisma.transaction.create({
      data: {
        iid,
        userId: user.id,
        type: 'THIRD_PARTY_EXPENSE',
        timestamp: time,
        categoryId: category.id,
        note: '',
        vendor,
        payer,
        lines: {create: lines},
        splits: {
          create: [
            {
              companionName: payer,
              companionShareNanos: ownShareAmountNanos,
              companionPaidNanos: fullAmountNanos,
            },
          ],
        },
        ...(overrides.tripId ? {tripId: overrides.tripId} : {}),
        ...(tagIds ? {tags: {connect: tagIds.map(id => ({id}))}} : {}),
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
