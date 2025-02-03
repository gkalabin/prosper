/* eslint-disable @typescript-eslint/no-explicit-any */
import {assert, assertDefined, assertNotDefined} from '@/lib/assert';
import prisma from '@/lib/prisma';
import {AccountOwnershipNEW, AccountTypeNEW, Prisma} from '@prisma/client';

export async function GET(): Promise<Response> {
  await prisma.$transaction(
    async tx => {
      await migrate(tx);
    },
    {timeout: 120_000}
  );
  return new Response('OK', {
    status: 200,
  });
}

async function migrate(tx: Prisma.TransactionClient) {
  const oldToNew = await migrateAccounts(tx);
  const users = await tx.user.findMany();
  const expenseByUser: Record<number, any> = {};
  const incomeByUser: Record<number, any> = {};
  for (const u of users) {
    expenseByUser[u.id] = await tx.accountNEW.create({
      data: {
        name: '[System] Expense',
        type: AccountTypeNEW.EXPENSE,
        ownership: AccountOwnershipNEW.SYSTEM,
        userId: u.id,
      },
    });
    incomeByUser[u.id] = await tx.accountNEW.create({
      data: {
        name: '[System] Income',
        type: AccountTypeNEW.INCOME,
        ownership: AccountOwnershipNEW.SYSTEM,
        userId: u.id,
      },
    });
  }
  console.log('system accounts created', expenseByUser, incomeByUser);
  const txs = await tx.transaction.findMany({
    include: {
      tags: {
        select: {
          id: true,
        },
      },
    },
  });

  const otherUserAccounts: Record<string, any> = {};
  for (const t of txs) {
    if (t.id % 1000 == 0) {
      console.log(`processing ${t.id} / ${txs.length}`);
    }
    if (t.transactionType == 'PERSONAL_EXPENSE') {
      assert(!t.incomingAccountId, t.id + ' on assert(!t.incomingAccountId)');
      assert(
        !t.incomingAmountCents,
        t.id + ' on assert(!t.incomingAmountCents)'
      );

      if (t.otherPartyName) {
        assertDefined(
          t.ownShareAmountCents,
          t.id + ' on assertDefined(t.ownShareAmountCents)'
        );
        await tx.transactionNEW.create({
          data: {
            description: t.description,
            timestamp: t.timestamp,
            tripId: t.tripId,
            userId: t.userId,
            lines: {
              create: [
                {
                  debitCents: 0,
                  creditCents: t.outgoingAmountCents,
                  accountId: oldToNew[t.outgoingAccountId!],
                  categoryId: null,
                  counterparty: t.vendor,
                },
                {
                  debitCents: t.ownShareAmountCents,
                  creditCents: 0,
                  categoryId: t.categoryId,
                  counterparty: t.vendor,
                  accountId: expenseByUser[t.userId].id,
                },
                {
                  accountId: (
                    await otherPartyAccount(
                      tx,
                      t.id,
                      t.otherPartyName,
                      otherUserAccounts,
                      t.userId
                    )
                  ).id,
                  debitCents: t.outgoingAmountCents! - t.ownShareAmountCents!,
                  creditCents: 0,
                  categoryId: t.categoryId,
                  counterparty: t.vendor,
                },
              ],
            },
            tags: {
              connect: t.tags,
            },
          },
        });
      } else {
        assert(
          t.ownShareAmountCents == t.outgoingAmountCents,
          t.id + ' on assert(t.ownShareAmountCents == t.outgoingAmountCents)'
        );
        await tx.transactionNEW.create({
          data: {
            description: t.description,
            timestamp: t.timestamp,
            tripId: t.tripId,
            userId: t.userId,
            lines: {
              create: [
                {
                  debitCents: 0,
                  creditCents: t.outgoingAmountCents,
                  accountId: oldToNew[t.outgoingAccountId!],
                  categoryId: null,
                  counterparty: t.vendor,
                },
                {
                  debitCents: t.outgoingAmountCents,
                  creditCents: 0,
                  categoryId: t.categoryId,
                  counterparty: t.vendor,
                  accountId: expenseByUser[t.userId].id,
                },
              ],
            },
            tags: {
              connect: t.tags,
            },
          },
        });
      }

      continue;
    }
    if (t.transactionType == 'INCOME') {
      assert(!t.outgoingAccountId, t.id + ' on assert(!t.outgoingAccountId)');
      assert(
        !t.outgoingAmountCents,
        t.id + ' on assert(!t.outgoingAmountCents)'
      );
      if (t.otherPartyName) {
        assertDefined(
          t.ownShareAmountCents,
          t.id + ' on assertDefined(t.ownShareAmountCents)'
        );
        await tx.transactionNEW.create({
          data: {
            description: t.description,
            timestamp: t.timestamp,
            tripId: t.tripId,
            userId: t.userId,
            lines: {
              create: [
                {
                  debitCents: t.incomingAmountCents,
                  creditCents: 0,
                  accountId: oldToNew[t.incomingAccountId!],
                  categoryId: null,
                  counterparty: t.payer,
                },
                {
                  debitCents: 0,
                  creditCents: t.ownShareAmountCents,
                  categoryId: t.categoryId,
                  counterparty: t.payer,
                  accountId: incomeByUser[t.userId].id,
                },
                {
                  accountId: (
                    await otherPartyAccount(
                      tx,
                      t.id,
                      t.otherPartyName,
                      otherUserAccounts,
                      t.userId
                    )
                  ).id,
                  debitCents: 0,
                  creditCents: t.incomingAmountCents! - t.ownShareAmountCents!,
                  categoryId: t.categoryId,
                  counterparty: t.payer,
                },
              ],
            },
            tags: {
              connect: t.tags,
            },
          },
        });
      } else {
        await tx.transactionNEW.create({
          data: {
            description: t.description,
            timestamp: t.timestamp,
            tripId: t.tripId,
            userId: t.userId,
            lines: {
              create: [
                {
                  debitCents: t.incomingAmountCents,
                  creditCents: 0,
                  accountId: oldToNew[t.incomingAccountId!],
                  categoryId: null,
                  counterparty: t.payer,
                },
                {
                  debitCents: 0,
                  creditCents: t.incomingAmountCents,
                  categoryId: t.categoryId,
                  counterparty: t.payer,
                  accountId: incomeByUser[t.userId].id,
                },
              ],
            },
            tags: {
              connect: t.tags,
            },
          },
        });
      }
      continue;
    }
    if (t.transactionType == 'TRANSFER') {
      assertDefined(
        t.outgoingAccountId,
        t.id + ' on assertDefined(t.outgoingAccountId)'
      );
      assertDefined(
        t.incomingAccountId,
        t.id + ' on assertDefined(t.incomingAccountId)'
      );
      assertDefined(
        t.outgoingAmountCents,
        t.id + ' on assertDefined(t.outgoingAmountCents)'
      );
      assertDefined(
        t.incomingAmountCents,
        t.id + ' on assertDefined(t.incomingAmountCents)'
      );
      assertNotDefined(
        t.ownShareAmountCents,
        t.id + ' on assertNotDefined(t.ownShareAmountCents)'
      );
      assertNotDefined(
        t.otherPartyName,
        t.id + ' on assertNotDefined(t.otherPartyName)'
      );
      assertNotDefined(t.payer, t.id + ' on assertNotDefined(t.payer)');
      assertNotDefined(t.vendor, t.id + ' on assertNotDefined(t.vendor)');
      assertNotDefined(
        t.payerOutgoingAmountCents,
        t.id + ' on assertNotDefined(t.payerOutgoingAmountCents)'
      );
      await tx.transactionNEW.create({
        data: {
          description: t.description,
          timestamp: t.timestamp,
          tripId: t.tripId,
          userId: t.userId,
          lines: {
            create: [
              {
                debitCents: 0,
                creditCents: t.outgoingAmountCents,
                accountId: oldToNew[t.outgoingAccountId!],
                categoryId: t.categoryId,
                counterparty: null,
              },
              {
                debitCents: t.incomingAmountCents,
                creditCents: 0,
                categoryId: t.categoryId,
                counterparty: null,
                accountId: oldToNew[t.incomingAccountId!],
              },
            ],
          },
          tags: {
            connect: t.tags,
          },
        },
      });
      continue;
    }
    if (t.transactionType == 'THIRD_PARTY_EXPENSE') {
      assertNotDefined(
        t.outgoingAccountId,
        t.id + ' on assertNotDefined(t.outgoingAccountId)'
      );
      assertNotDefined(
        t.incomingAccountId,
        t.id + ' on assertNotDefined(t.incomingAccountId)'
      );
      assertNotDefined(
        t.outgoingAmountCents,
        t.id + ' on assertNotDefined(t.outgoingAmountCents)'
      );
      assertNotDefined(
        t.incomingAmountCents,
        t.id + ' on assertNotDefined(t.incomingAmountCents)'
      );
      const otherUserAcc = await otherPartyAccount(
        tx,
        t.id,
        t.payer!,
        otherUserAccounts,
        t.userId
      );

      await tx.transactionNEW.create({
        data: {
          description: t.description,
          timestamp: t.timestamp,
          tripId: t.tripId,
          userId: t.userId,
          lines: {
            create: [
              {
                debitCents: 0,
                creditCents: t.payerOutgoingAmountCents,
                accountId: otherUserAcc.id,
                categoryId: null,
                counterparty: t.vendor,
              },
              {
                debitCents: t.payerOutgoingAmountCents,
                creditCents: 0,
                categoryId: t.categoryId,
                counterparty: t.vendor,
                accountId: expenseByUser[t.userId].id,
              },
            ],
          },
          tags: {
            connect: t.tags,
          },
        },
      });
      continue;
    }
    throw new Error(`Cannot handle transaction: ${JSON.stringify(t, null, 2)}`);
  }

  return new Response('OK', {
    status: 200,
  });
}

async function otherPartyAccount(
  tx: Prisma.TransactionClient,
  tid: number,
  payer: string,
  accounts: Record<string, any>,
  userId: number
) {
  if (payer.trim() == '') {
    throw new Error(`payer is empty string: '${payer}' for ${tid}`);
  }
  const otherUserAcc = accounts[payer];
  if (otherUserAcc) {
    return otherUserAcc;
  }
  const newOtherUserAcc = await tx.accountNEW.create({
    data: {
      name: payer,
      type: AccountTypeNEW.ASSET,
      ownership: AccountOwnershipNEW.OWNED_BY_OTHER,
      userId: userId,
    },
  });
  accounts[payer] = newOtherUserAcc;
  return newOtherUserAcc;
}

async function migrateAccounts(tx: Prisma.TransactionClient) {
  const bankAccounts = await tx.bankAccount.findMany({
    // order first by userid, then by bankid, then by displayOrder
    orderBy: [{userId: 'asc'}, {bankId: 'asc'}, {displayOrder: 'asc'}],
  });
  const users = await tx.user.findMany();
  const equityByUser: Record<number, any> = {};
  for (const u of users) {
    equityByUser[u.id] = await tx.accountNEW.create({
      data: {
        name: '[System] Equity',
        type: AccountTypeNEW.EQUITY,
        ownership: AccountOwnershipNEW.SYSTEM,
        userId: u.id,
      },
    });
  }

  const oldToNew: Record<number, number> = {};
  for (const oldAccount of bankAccounts) {
    const newAccount = await tx.accountNEW.create({
      data: {
        name: oldAccount.name,
        type: AccountTypeNEW.ASSET,
        ownership: oldAccount.joint
          ? AccountOwnershipNEW.JOINT_HALF
          : AccountOwnershipNEW.SELF_OWNED,
        currencyCode: oldAccount.currencyCode,
        stockId: oldAccount.stockId,
        userId: oldAccount.userId,
        bankId: oldAccount.bankId,
        displayOrder: oldAccount.displayOrder,
        archived: oldAccount.archived,
      },
    });
    oldToNew[oldAccount.id] = newAccount.id;
    if (oldAccount.initialBalanceCents != 0) {
      const balance = oldAccount.initialBalanceCents;
      await tx.transactionNEW.create({
        data: {
          description: 'Initial balance',
          timestamp: oldAccount.createdAt,
          userId: oldAccount.userId,
          lines: {
            create: [
              {
                debitCents: balance > 0 ? balance : 0,
                creditCents: balance < 0 ? -balance : 0,
                accountId: newAccount.id,
              },
              {
                debitCents: balance < 0 ? -balance : 0,
                creditCents: balance > 0 ? balance : 0,
                accountId: equityByUser[oldAccount.userId].id,
              },
            ],
          },
        },
      });
    }
  }
  return oldToNew;
}
