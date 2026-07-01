import * as bcrypt from 'bcrypt';
import {createHash} from 'crypto';
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
  OpenBankingTransactionSeed,
  Stock,
  StockKey,
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
  OpenBankingTransactionSeed,
  Stock,
  Tag,
  TestDataBundle,
  User,
  UserWithRawPassword,
} from './types';

import {
  DEFAULT_TEST_CURRENCY,
  NANOS_PER_DOLLAR,
  OPEN_BANKING_PROVIDER,
  TEST_USER_PASSWORD,
} from './constants';

// BankAccountRow mirrors the raw BankAccount SQL columns, including the
// (stockExchange, stockTicker) pair that the logical BankAccount exposes
// as a single `stock` key.
interface BankAccountRow extends RowDataPacket {
  id: number;
  userId: number;
  bankId: number;
  name: string;
  currencyCode: string | null;
  stockExchange: string | null;
  stockTicker: string | null;
  archived: number;
  joint: number;
  displayOrder: number;
}
interface IDRow extends RowDataPacket {
  id: number;
}
interface StockRow extends RowDataPacket {
  name: string;
  ticker: string;
  exchange: string;
  currencyCode: string;
}

// stockKeyOf returns the (exchange, ticker) pair of a stock-denominated
// account row, or null when the account is currency-denominated.
function stockKeyOf(row: BankAccountRow): StockKey | null {
  if (row.stockExchange === null || row.stockTicker === null) {
    return null;
  }
  return {exchange: row.stockExchange, ticker: row.stockTicker};
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
    const stock = overrides?.stock ?? null;
    const currencyCode = stock
      ? null
      : (overrides?.currencyCode ?? DEFAULT_TEST_CURRENCY);
    const name = overrides?.name ?? 'Test Account';
    const archived = overrides?.archived ?? false;
    const joint = overrides?.joint ?? false;
    const displayOrder = overrides?.displayOrder ?? 0;
    const id = await insert(
      `INSERT INTO BankAccount (userId, bankId, name, currencyCode, stockExchange, stockTicker, archived, joint, displayOrder)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        bankId,
        name,
        currencyCode,
        stock?.exchange ?? null,
        stock?.ticker ?? null,
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
        stock,
      });
    }
    return {id, userId, bankId, name, currencyCode, stock};
  }

  async openingBalance({
    userId,
    bankAccountId,
    initialBalance,
    currencyCode,
    stock,
    timestamp,
  }: {
    userId: number;
    bankAccountId: number;
    initialBalance: number;
    currencyCode?: string | null;
    stock?: StockKey | null;
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
      stock ?? null,
      amountNanos
    );
    await insertLine(
      userId,
      txId,
      equityRow.id,
      currencyCode ?? null,
      stock ?? null,
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
    // The Stock catalog is shared across tests and cleaned only at teardown,
    // so seeding the same (exchange, ticker) from multiple tests must be
    // idempotent. Reuse a matching row; reject a conflicting redefinition.
    const found = await query<StockRow[]>(
      `SELECT name, ticker, exchange, currencyCode FROM Stock
       WHERE exchange = ? AND ticker = ?`,
      [exchange, ticker]
    );
    if (found.length > 1) {
      throw new Error(
        `Stock ${exchange}-${ticker} appears ${found.length} times in Stock table`
      );
    }
    if (found.length == 1) {
      const existing = found[0];
      if (existing.name !== name || existing.currencyCode !== currencyCode) {
        throw new Error(
          `Stock ${exchange}-${ticker} already seeded as ` +
            `{name: ${existing.name}, currencyCode: ${existing.currencyCode}}, ` +
            `cannot redefine as {name: ${name}, currencyCode: ${currencyCode}}`
        );
      }
      return existing;
    }
    await exec(
      `INSERT INTO Stock (name, ticker, exchange, currencyCode)
       VALUES (?, ?, ?, ?)`,
      [name, ticker, exchange, currencyCode]
    );
    return {name, ticker, exchange, currencyCode};
  }

  async createStockQuote(stock: StockKey, pricePerShare: number) {
    const valueNanos = BigInt(Math.round(pricePerShare * NANOS_PER_DOLLAR));
    await exec(
      `INSERT INTO StockQuote (stockExchange, stockTicker, valueNanos, quoteTimestamp)
       VALUES (?, ?, ?, NOW(3))`,
      [stock.exchange, stock.ticker, valueNanos]
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
    const stock = stockKeyOf(bankAccountRow);
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
      stock,
      -amountNanos
    );
    await insertLine(
      user.id,
      txId,
      expenseRow.id,
      currencyCode,
      stock,
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
        stock,
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
    const stock = stockKeyOf(bankAccountRow);
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
      stock,
      amountNanos
    );
    await insertLine(
      user.id,
      txId,
      incomeRow.id,
      currencyCode,
      stock,
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
        stock,
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
    const fromStock = stockKeyOf(fromBank);
    const toStock = stockKeyOf(toBank);
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
      fromStock,
      -amountNanos
    );
    await insertLine(
      user.id,
      txId,
      toAsset.id,
      toBank.currencyCode,
      toStock,
      receivedAmountNanos
    );
    if (
      fromBank.currencyCode !== toBank.currencyCode ||
      fromBank.stockExchange !== toBank.stockExchange ||
      fromBank.stockTicker !== toBank.stockTicker
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
        fromStock,
        amountNanos
      );
      await insertLine(
        user.id,
        txId,
        fxRow.id,
        toBank.currencyCode,
        toStock,
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

  // openBankingTransactions makes the given transactions appear as open
  // banking suggestions for an account. It links the bank account to an
  // external account, records a successful fetch, and stores the
  // transactions against that fetch. Calling it repeatedly for the same
  // account appends further fetches against the one external account link.
  async openBankingTransactions({
    user,
    bank,
    account,
    transactions,
  }: {
    user: {id: number};
    bank: {id: number};
    account: {id: number};
    transactions: OpenBankingTransactionSeed[];
  }): Promise<void> {
    await this.maybeLinkExternalAccount(user, bank, account);
    const now = new Date();
    const fetchId = await insert(
      `INSERT INTO OpenBankingFetch
         (userId, internalAccountId, provider, \`trigger\`, status, txCount, startedAt, finishedAt)
       VALUES (?, ?, ?, 'MANUAL', 'SUCCESS', ?, ?, ?)`,
      [
        user.id,
        account.id,
        OPEN_BANKING_PROVIDER,
        transactions.length,
        now,
        now,
      ]
    );
    for (const t of transactions) {
      const txId = await insertOpenBankingTransaction(user.id, t);
      await exec(
        `INSERT INTO OpenBankingFetchTransaction (userId, fetchId, openBankingTransactionId)
         VALUES (?, ?, ?)`,
        [user.id, fetchId, txId]
      );
    }
  }

  // connectOpenBankingAccount links an internal bank account to a provider
  // account without recording any fetch, modelling an account that is
  // connected but has never been synced.
  async connectOpenBankingAccount({
    user,
    bank,
    account,
  }: {
    user: {id: number};
    bank: {id: number};
    account: {id: number};
  }): Promise<void> {
    await this.maybeLinkExternalAccount(user, bank, account);
  }

  // openBankingFetchError records a failed fetch for a connected account: a
  // fetch row with ERROR status carrying the provider's error message and no
  // transactions or balance.
  async openBankingFetchError({
    user,
    bank,
    account,
    error,
  }: {
    user: {id: number};
    bank: {id: number};
    account: {id: number};
    error: string;
  }): Promise<void> {
    await this.maybeLinkExternalAccount(user, bank, account);
    const now = new Date();
    await exec(
      `INSERT INTO OpenBankingFetch
         (userId, internalAccountId, provider, \`trigger\`, status, error, txCount, startedAt, finishedAt)
       VALUES (?, ?, ?, 'MANUAL', 'ERROR', ?, 0, ?, ?)`,
      [user.id, account.id, OPEN_BANKING_PROVIDER, error, now, now]
    );
  }

  // maybeLinkExternalAccount maps an internal bank account to a provider
  // account once, so repeated fetches against the same account reuse the
  // mapping.
  private async maybeLinkExternalAccount(
    user: {id: number},
    bank: {id: number},
    account: {id: number}
  ): Promise<void> {
    const existing = await query<RowDataPacket[]>(
      `SELECT internalAccountId FROM ExternalAccountMapping WHERE internalAccountId = ?`,
      [account.id]
    );
    if (existing.length) {
      return;
    }
    await exec(
      `INSERT INTO ExternalAccountMapping (userId, internalAccountId, externalAccountId, bankId)
       VALUES (?, ?, ?, ?)`,
      [user.id, account.id, `ext-account-${account.id}`, bank.id]
    );
  }
}

// insertOpenBankingTransaction stores one bank transaction as an open
// banking provider would report it and returns its id.
async function insertOpenBankingTransaction(
  userId: number,
  t: OpenBankingTransactionSeed
): Promise<number> {
  const time = t.timestamp ? new Date(t.timestamp) : new Date();
  const signedAmountNanos = BigInt(Math.round(t.amount * NANOS_PER_DOLLAR));
  const raw = JSON.stringify({
    externalId: t.externalId,
    description: t.description,
    amount: t.amount,
  });
  const rawHash = createHash('sha256').update(raw).digest('hex');
  return insert(
    `INSERT INTO OpenBankingTransaction
       (userId, externalTransactionId, timestamp, description, signedAmountNanos, raw, rawHash)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      t.externalId,
      time,
      t.description,
      signedAmountNanos.toString(),
      raw,
      rawHash,
    ]
  );
}

async function insertLine(
  userId: number,
  transactionId: number,
  ledgerAccountId: number,
  currencyCode: string | null,
  stock: StockKey | null,
  amountNanos: bigint
): Promise<void> {
  await exec(
    `INSERT INTO EntryLine (userId, transactionId, ledgerAccountId, currencyCode, stockExchange, stockTicker, amountNanos)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      transactionId,
      ledgerAccountId,
      currencyCode,
      stock?.exchange ?? null,
      stock?.ticker ?? null,
      amountNanos.toString(),
    ]
  );
}

async function attachTags(
  transactionId: number,
  tagIds: number[]
): Promise<void> {
  for (const tagId of tagIds) {
    await exec(
      `INSERT INTO TagTransaction (tagId, transactionId) VALUES (?, ?)`,
      [tagId, transactionId]
    );
  }
}
