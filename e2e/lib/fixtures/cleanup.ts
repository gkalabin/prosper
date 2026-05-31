import {RowDataPacket} from 'mysql2/promise';
import {exec, pool, query} from '../db';

interface IDRow extends RowDataPacket {
  id: number;
}

// USER_TABLES_BY_USER_ID lists every per-user table cleaned by
// cleanupForUserLogins, in dependency order: rows referencing other
// rows are deleted first.
const USER_TABLES_BY_USER_ID = [
  'ExternalAccountMapping',
  'BankAccount',
  'LedgerAccount',
  'Bank',
  'Category',
  'Tag',
  'Trip',
  'DisplaySettings',
  'TrueLayerToken',
  'GoCardlessToken',
  'GoCardlessRequisition',
  'StarlingToken',
  'Session',
];

// cleanupForUserLogins removes every row created on behalf of the
// given users, in dependency order. Used by TestFactory.cleanUp at the
// end of each test.
export async function cleanupForUserLogins(logins: string[]): Promise<void> {
  if (logins.length === 0) {
    return;
  }
  const conn = await pool.getConnection();
  try {
    const placeholders = logins.map(() => '?').join(',');
    const userRows = await query<IDRow[]>(
      `SELECT id FROM User WHERE login IN (${placeholders})`,
      logins
    );
    const userIds = userRows.map(r => r.id);
    if (userIds.length === 0) {
      return;
    }
    const userIn = userIds.map(() => '?').join(',');
    await deleteTransactionsForUsers(userIds, userIn);
    for (const table of USER_TABLES_BY_USER_ID) {
      await exec(`DELETE FROM ${table} WHERE userId IN (${userIn})`, userIds);
    }
    await exec(`DELETE FROM User WHERE id IN (${userIn})`, userIds);
  } catch (error) {
    console.error('Failed to cleanup test data:', error);
  } finally {
    conn.release();
  }
}

// deleteTransactionsForUsers tears down everything that hangs off a
// Transaction row (lines, splits, links, prototypes, tag joins) before
// dropping the transactions themselves.
async function deleteTransactionsForUsers(
  userIds: number[],
  userIn: string
): Promise<void> {
  const txRows = await query<IDRow[]>(
    `SELECT id FROM Transaction WHERE userId IN (${userIn})`,
    userIds
  );
  const txIds = txRows.map(r => r.id);
  if (txIds.length === 0) {
    return;
  }
  const txIn = txIds.map(() => '?').join(',');
  await exec(
    `DELETE FROM TagTransaction WHERE transactionId IN (${txIn})`,
    txIds
  );
  await exec(
    `DELETE FROM TransactionLink
     WHERE sourceTransactionId IN (${txIn}) OR linkedTransactionId IN (${txIn})`,
    [...txIds, ...txIds]
  );
  await exec(
    `DELETE FROM SplitContext WHERE transactionId IN (${txIn})`,
    txIds
  );
  await exec(`DELETE FROM EntryLine WHERE transactionId IN (${txIn})`, txIds);
  await exec(
    `DELETE FROM TransactionPrototype WHERE internalTransactionId IN (${txIn})`,
    txIds
  );
  await exec(`DELETE FROM Transaction WHERE id IN (${txIn})`, txIds);
}

// cleanupGlobalEntities removes the cross-user state (stock catalog,
// historical quotes, exchange rates) so successive runs start clean.
export async function cleanupGlobalEntities(): Promise<void> {
  console.log('Running global cleanup...');
  try {
    await exec(`DELETE FROM StockQuote`);
    await exec(`DELETE FROM Stock`);
    await exec(`DELETE FROM ExchangeRate`);
  } catch (error) {
    console.error('Failed to run global cleanup:', error);
  }
}
