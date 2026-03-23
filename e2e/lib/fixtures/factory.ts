import * as bcrypt from 'bcrypt';
import {RowDataPacket} from 'mysql2/promise';
// eslint-plugin-import's resolver doesn't follow uuid 14's conditional exports.
// eslint-disable-next-line import/named
import {v4 as uuidv4} from 'uuid';
import {exec, insert, query} from '../db';
import {cleanupForUserLogins, cleanupGlobalEntities} from './cleanup';
import {
  Bank,
  BankAccount,
  Category,
  Stock,
  Tag,
  TestDataBundle,
  TransactionContext,
  UserWithRawPassword,
} from './types';

export {
  DEFAULT_TEST_CURRENCY,
  NANOS_PER_DOLLAR,
  TEST_USER_PASSWORD,
} from './constants';
export type {
  Bank,
  BankAccount,
  Category,
  Stock,
  Tag,
  TestDataBundle,
  User,
  UserWithRawPassword,
} from './types';

import {
  DEFAULT_TEST_CURRENCY,
  NANOS_PER_DOLLAR,
  TEST_USER_PASSWORD,
} from './constants';

interface BankAccountRow extends RowDataPacket, BankAccount {}
interface IDRow extends RowDataPacket {
  id: number;
}

export class TestFactory {
  private createdUsers: string[] = [];
  private iidCounterByUser: Record<number, number> = {};

  registerUserForCleanup(login: string) {
    this.createdUsers.push(login);
  }

  async cleanUp() {
    console.log('Cleaning up users', this.createdUsers);
    await cleanupForUserLogins(this.createdUsers);
  }

  // Cleans up global entities that are NOT user-specific.
  static async globalCleanUp() {
    await cleanupGlobalEntities();
  }

  async createUserWithMultipleAccounts(overrides?: {
    user?: Partial<UserWithRawPassword>;
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
    user?: Partial<UserWithRawPassword>;
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

  private async nextIid(userId: number): Promise<number> {
    if (this.iidCounterByUser[userId] === undefined) {
      this.iidCounterByUser[userId] = 1;
    }
    return this.iidCounterByUser[userId]++;
  }

  async createUser(
    overrides?: Partial<UserWithRawPassword>
  ): Promise<UserWithRawPassword> {
    const login = overrides?.login ?? 'e2e_test_user_' + uuidv4().slice(0, 8);
    const rawPassword = overrides?.rawPassword || TEST_USER_PASSWORD;
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    const userId = await insert(
      `INSERT INTO User (login, password) VALUES (?, ?)`,
      [login, passwordHash]
    );
    const systemTypes = ['EXPENSE', 'INCOME', 'EQUITY', 'CURRENCY_EXCHANGE'];
    for (const t of systemTypes) {
      await exec(
        `INSERT INTO LedgerAccount (userId, name, type) VALUES (?, ?, ?)`,
        [userId, `SYSTEM:${t}`, t]
      );
    }
    await exec(
      `INSERT INTO DisplaySettings (userId, displayCurrencyCode, excludeCategoryIdsInStats)
       VALUES (?, ?, '')`,
      [userId, DEFAULT_TEST_CURRENCY]
    );
    this.createdUsers.push(login);
    return {id: userId, login, password: passwordHash, rawPassword};
  }

  async createBank(userId: number, overrides?: Partial<Bank>): Promise<Bank> {
    const name = overrides?.name ?? 'Test Bank';
    const id = await insert(`INSERT INTO Bank (userId, name) VALUES (?, ?)`, [
      userId,
      name,
    ]);
    return {id, userId, name};
  }

  async createAccount(
    userId: number,
    bankId: number,
    overrides?: Partial<BankAccount> & {initialBalance?: number}
  ): Promise<BankAccount> {
    const stockId = overrides?.stockId ?? null;
    const currencyCode =
      stockId === null
        ? (overrides?.currencyCode ?? DEFAULT_TEST_CURRENCY)
        : null;
    const name = overrides?.name ?? 'Test Account';
    const archived = overrides?.archived ?? false;
    const joint = overrides?.joint ?? false;
    const displayOrder = overrides?.displayOrder ?? 0;
    const id = await insert(
      `INSERT INTO BankAccount (userId, bankId, name, currencyCode, stockId, archived, joint, displayOrder)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        bankId,
        name,
        currencyCode,
        stockId,
        archived,
        joint,
        displayOrder,
      ]
    );
    await exec(
      `INSERT INTO LedgerAccount (userId, name, type, bankAccountId)
       VALUES (?, ?, 'ASSET', ?)`,
      [userId, name, id]
    );
    if (overrides?.initialBalance) {
      await this.openingBalance({
        userId,
        bankAccountId: id,
        initialBalance: overrides.initialBalance,
        currencyCode,
        stockId,
      });
    }
    return {id, userId, bankId, name, currencyCode, stockId};
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
    const [assetRow] = await query<IDRow[]>(
      `SELECT id FROM LedgerAccount
       WHERE userId = ? AND bankAccountId = ? AND type = 'ASSET'`,
      [userId, bankAccountId]
    );
    const [equityRow] = await query<IDRow[]>(
      `SELECT id FROM LedgerAccount WHERE userId = ? AND type = 'EQUITY'`,
      [userId]
    );
    if (!assetRow || !equityRow) {
      throw new Error(
        `missing ledger accounts for user ${userId} bankAccount ${bankAccountId}`
      );
    }
    const iid = await this.nextIid(userId);
    const time = timestamp ? new Date(timestamp) : new Date();
    const txId = await insert(
      `INSERT INTO Transaction (iid, userId, timestamp, type)
       VALUES (?, ?, ?, 'OPENING_BALANCE')`,
      [iid, userId, time]
    );
    await insertLine(
      userId,
      txId,
      assetRow.id,
      currencyCode ?? null,
      stockId ?? null,
      amountNanos
    );
    await insertLine(
      userId,
      txId,
      equityRow.id,
      currencyCode ?? null,
      stockId ?? null,
      -amountNanos
    );
    return txId;
  }

  async createCategory(
    userId: number,
    overrides?: Partial<Category>
  ): Promise<Category> {
    const name = overrides?.name ?? 'Test Category';
    const parentCategoryId = overrides?.parentCategoryId ?? null;
    const displayOrder = overrides?.displayOrder ?? 0;
    const id = await insert(
      `INSERT INTO Category (userId, name, parentCategoryId, displayOrder)
       VALUES (?, ?, ?, ?)`,
      [userId, name, parentCategoryId, displayOrder]
    );
    return {id, userId, name, parentCategoryId, displayOrder};
  }

  async getOrCreateReceivableAccount(userId: number, companionName: string) {
    const name = `RECEIVABLE:${companionName}`;
    const existing = await query<IDRow[]>(
      `SELECT id FROM LedgerAccount
       WHERE userId = ? AND type = 'RECEIVABLE' AND name = ?`,
      [userId, name]
    );
    if (existing[0]) {
      return {id: existing[0].id, userId, name, type: 'RECEIVABLE' as const};
    }
    const id = await insert(
      `INSERT INTO LedgerAccount (userId, name, type)
       VALUES (?, ?, 'RECEIVABLE')`,
      [userId, name]
    );
    return {id, userId, name, type: 'RECEIVABLE' as const};
  }

  async createTag(userId: number, name: string): Promise<Tag> {
    const id = await insert(`INSERT INTO Tag (userId, name) VALUES (?, ?)`, [
      userId,
      name,
    ]);
    return {id, userId, name};
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
  }): Promise<Stock> {
    const id = await insert(
      `INSERT INTO Stock (name, ticker, exchange, currencyCode)
       VALUES (?, ?, ?, ?)`,
      [name, ticker, exchange, currencyCode]
    );
    return {id, name, ticker, exchange, currencyCode};
  }

  async createStockQuote(stockId: number, pricePerShare: number) {
    const valueCents = Math.round(pricePerShare * 100);
    await exec(
      `INSERT INTO StockQuote (stockId, value, quoteTimestamp)
       VALUES (?, ?, NOW(3))`,
      [stockId, valueCents]
    );
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
      tripId,
    }: TransactionContext & {
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
    const [bankAccountRow] = await query<BankAccountRow[]>(
      `SELECT * FROM BankAccount WHERE id = ?`,
      [account.id]
    );
    const [assetRow] = await query<IDRow[]>(
      `SELECT id FROM LedgerAccount WHERE bankAccountId = ?`,
      [account.id]
    );
    const [expenseRow] = await query<IDRow[]>(
      `SELECT id FROM LedgerAccount WHERE userId = ? AND type = 'EXPENSE'`,
      [user.id]
    );
    const currencyCode = bankAccountRow.currencyCode ?? null;
    const stockId = bankAccountRow.stockId ?? null;
    const txId = await insert(
      `INSERT INTO Transaction (iid, userId, type, timestamp, categoryId, note, vendor, tripId)
       VALUES (?, ?, 'EXPENSE', ?, ?, ?, ?, ?)`,
      [
        iid,
        user.id,
        time,
        category.id,
        description ?? '',
        vendor,
        tripId ?? null,
      ]
    );
    await insertLine(
      user.id,
      txId,
      assetRow.id,
      currencyCode,
      stockId,
      -amountNanos
    );
    await insertLine(
      user.id,
      txId,
      expenseRow.id,
      currencyCode,
      stockId,
      ownShareAmountNanos
    );
    if (otherPartyName) {
      const companionShareNanos = amountNanos - ownShareAmountNanos;
      const recv = await this.getOrCreateReceivableAccount(
        user.id,
        otherPartyName
      );
      await insertLine(
        user.id,
        txId,
        recv.id,
        currencyCode,
        stockId,
        companionShareNanos
      );
      await exec(
        `INSERT INTO SplitContext (userId, transactionId, companionName, companionShareNanos, companionPaidNanos)
         VALUES (?, ?, ?, ?, 0)`,
        [user.id, txId, otherPartyName, companionShareNanos.toString()]
      );
    }
    if (tagIds) {
      await attachTags(txId, tagIds);
    }
    return {id: txId};
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
      tripId,
    }: TransactionContext & {
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
    const [bankAccountRow] = await query<BankAccountRow[]>(
      `SELECT * FROM BankAccount WHERE id = ?`,
      [account.id]
    );
    const [assetRow] = await query<IDRow[]>(
      `SELECT id FROM LedgerAccount WHERE bankAccountId = ?`,
      [account.id]
    );
    const [incomeRow] = await query<IDRow[]>(
      `SELECT id FROM LedgerAccount WHERE userId = ? AND type = 'INCOME'`,
      [user.id]
    );
    const currencyCode = bankAccountRow.currencyCode ?? null;
    const stockId = bankAccountRow.stockId ?? null;
    const txId = await insert(
      `INSERT INTO Transaction (iid, userId, type, timestamp, categoryId, note, payer, tripId)
       VALUES (?, ?, 'INCOME', ?, ?, ?, ?, ?)`,
      [
        iid,
        user.id,
        time,
        category.id,
        description ?? '',
        payer,
        tripId ?? null,
      ]
    );
    await insertLine(
      user.id,
      txId,
      assetRow.id,
      currencyCode,
      stockId,
      amountNanos
    );
    await insertLine(
      user.id,
      txId,
      incomeRow.id,
      currencyCode,
      stockId,
      -ownShareAmountNanos
    );
    if (otherPartyName) {
      const companionShareNanos = amountNanos - ownShareAmountNanos;
      const recv = await this.getOrCreateReceivableAccount(
        user.id,
        otherPartyName
      );
      await insertLine(
        user.id,
        txId,
        recv.id,
        currencyCode,
        stockId,
        -companionShareNanos
      );
      await exec(
        `INSERT INTO SplitContext (userId, transactionId, companionName, companionShareNanos, companionPaidNanos)
         VALUES (?, ?, ?, ?, 0)`,
        [user.id, txId, otherPartyName, companionShareNanos.toString()]
      );
    }
    if (tagIds) {
      await attachTags(txId, tagIds);
    }
    return {id: txId};
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
      tripId,
    }: {
      user: {id: number};
      from: {id: number};
      to: {id: number};
      category: {id: number};
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
    const [fromBank] = await query<BankAccountRow[]>(
      `SELECT * FROM BankAccount WHERE id = ?`,
      [from.id]
    );
    const [toBank] = await query<BankAccountRow[]>(
      `SELECT * FROM BankAccount WHERE id = ?`,
      [to.id]
    );
    const [fromAsset] = await query<IDRow[]>(
      `SELECT id FROM LedgerAccount WHERE bankAccountId = ?`,
      [from.id]
    );
    const [toAsset] = await query<IDRow[]>(
      `SELECT id FROM LedgerAccount WHERE bankAccountId = ?`,
      [to.id]
    );
    const txId = await insert(
      `INSERT INTO Transaction (iid, userId, type, timestamp, categoryId, note, tripId)
       VALUES (?, ?, 'TRANSFER', ?, ?, ?, ?)`,
      [iid, user.id, time, category.id, description ?? '', tripId ?? null]
    );
    await insertLine(
      user.id,
      txId,
      fromAsset.id,
      fromBank.currencyCode,
      fromBank.stockId,
      -amountNanos
    );
    await insertLine(
      user.id,
      txId,
      toAsset.id,
      toBank.currencyCode,
      toBank.stockId,
      receivedAmountNanos
    );
    if (
      fromBank.currencyCode !== toBank.currencyCode ||
      fromBank.stockId !== toBank.stockId
    ) {
      const [fxRow] = await query<IDRow[]>(
        `SELECT id FROM LedgerAccount WHERE userId = ? AND type = 'CURRENCY_EXCHANGE'`,
        [user.id]
      );
      await insertLine(
        user.id,
        txId,
        fxRow.id,
        fromBank.currencyCode,
        fromBank.stockId,
        amountNanos
      );
      await insertLine(
        user.id,
        txId,
        fxRow.id,
        toBank.currencyCode,
        toBank.stockId,
        -receivedAmountNanos
      );
    }
    if (tagIds) {
      await attachTags(txId, tagIds);
    }
    return {id: txId};
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
    tripId,
  }: {
    user: {id: number};
    category: {id: number};
    vendor: string;
    payer: string;
    fullAmount: number;
    ownShareAmount: number;
    currencyCode: string;
    timestamp?: Date | string;
    tagIds?: number[];
    tripId?: number;
  }) {
    const fullAmountNanos = BigInt(fullAmount * NANOS_PER_DOLLAR);
    const ownShareAmountNanos = BigInt(ownShareAmount * NANOS_PER_DOLLAR);
    const time = timestamp ? new Date(timestamp) : new Date();
    const iid = await this.nextIid(user.id);
    const [expenseRow] = await query<IDRow[]>(
      `SELECT id FROM LedgerAccount WHERE userId = ? AND type = 'EXPENSE'`,
      [user.id]
    );
    const recv = await this.getOrCreateReceivableAccount(user.id, payer);
    const txId = await insert(
      `INSERT INTO Transaction (iid, userId, type, timestamp, categoryId, note, vendor, payer, tripId)
       VALUES (?, ?, 'THIRD_PARTY_EXPENSE', ?, ?, '', ?, ?, ?)`,
      [iid, user.id, time, category.id, vendor, payer, tripId ?? null]
    );
    await insertLine(
      user.id,
      txId,
      expenseRow.id,
      currencyCode,
      null,
      ownShareAmountNanos
    );
    await insertLine(
      user.id,
      txId,
      recv.id,
      currencyCode,
      null,
      -ownShareAmountNanos
    );
    await exec(
      `INSERT INTO SplitContext (userId, transactionId, companionName, companionShareNanos, companionPaidNanos)
       VALUES (?, ?, ?, ?, ?)`,
      [
        user.id,
        txId,
        payer,
        ownShareAmountNanos.toString(),
        fullAmountNanos.toString(),
      ]
    );
    if (tagIds) {
      await attachTags(txId, tagIds);
    }
    return {id: txId};
  }

  async createExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    rate: number
  ) {
    await exec(
      `INSERT INTO ExchangeRate (currencyCodeFrom, currencyCodeTo, rateNanos, rateTimestamp)
       VALUES (?, ?, ?, NOW(3))`,
      [
        fromCurrency,
        toCurrency,
        BigInt(Math.round(rate * NANOS_PER_DOLLAR)).toString(),
      ]
    );
  }

  async updateDisplaySettings(
    userId: number,
    updates: {
      displayCurrencyCode?: string;
      excludeCategoryIdsInStats?: string;
    }
  ) {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (updates.displayCurrencyCode !== undefined) {
      fields.push('displayCurrencyCode = ?');
      values.push(updates.displayCurrencyCode);
    }
    if (updates.excludeCategoryIdsInStats !== undefined) {
      fields.push('excludeCategoryIdsInStats = ?');
      values.push(updates.excludeCategoryIdsInStats);
    }
    if (!fields.length) {
      return;
    }
    values.push(userId);
    await exec(
      `UPDATE DisplaySettings SET ${fields.join(', ')} WHERE userId = ?`,
      values
    );
  }

  async createTransactionLink(
    userId: number,
    sourceTransactionId: number,
    linkedTransactionId: number,
    linkType: 'REFUND' | 'DEBT_SETTLING'
  ) {
    await exec(
      `INSERT INTO TransactionLink (userId, sourceTransactionId, linkedTransactionId, linkType)
       VALUES (?, ?, ?, ?)`,
      [userId, sourceTransactionId, linkedTransactionId, linkType]
    );
  }
}

async function insertLine(
  userId: number,
  transactionId: number,
  ledgerAccountId: number,
  currencyCode: string | null,
  stockId: number | null,
  amountNanos: bigint
): Promise<void> {
  await exec(
    `INSERT INTO EntryLine (userId, transactionId, ledgerAccountId, currencyCode, stockId, amountNanos)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      userId,
      transactionId,
      ledgerAccountId,
      currencyCode,
      stockId,
      amountNanos.toString(),
    ]
  );
}

async function attachTags(
  transactionId: number,
  tagIds: number[]
): Promise<void> {
  for (const tagId of tagIds) {
    await exec(`INSERT INTO _TagToTransaction (A, B) VALUES (?, ?)`, [
      tagId,
      transactionId,
    ]);
  }
}
