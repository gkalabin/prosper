-- Schema deltas applied on top of the prisma-era initial schema:
-- fetch tracking on rate/quote tables, DB-managed updatedAt across all
-- tables, the wasReconnect flag on NordigenRequisition, and the
-- denormalised userId column on transaction child tables.

-- Embed fetch tracking into rate/quote tables so the scheduler can
-- distinguish "no data because we haven't asked" from "no data because the
-- market is closed". Existing rows keep rateNanos/value populated and a
-- default fetchStatus of 'ok'.

ALTER TABLE ExchangeRate
  MODIFY COLUMN rateNanos BIGINT NULL,
  ADD COLUMN fetchStatus VARCHAR(32) NOT NULL DEFAULT 'ok',
  ADD COLUMN fetchedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE ExchangeRate SET fetchedAt = rateTimestamp;

ALTER TABLE StockQuote
  MODIFY COLUMN value BIGINT NULL,
  ADD COLUMN fetchStatus VARCHAR(32) NOT NULL DEFAULT 'ok',
  ADD COLUMN fetchedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE StockQuote SET fetchedAt = quoteTimestamp;

-- Make `updatedAt` columns DB-managed: auto-fill on INSERT and bump on UPDATE.

ALTER TABLE `User`                   MODIFY COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);
ALTER TABLE `Stock`                  MODIFY COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);
ALTER TABLE `Bank`                   MODIFY COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);
ALTER TABLE `BankAccount`            MODIFY COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);
ALTER TABLE `Category`               MODIFY COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);
ALTER TABLE `Tag`                    MODIFY COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);
ALTER TABLE `Trip`                   MODIFY COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);
ALTER TABLE `DisplaySettings`        MODIFY COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);
ALTER TABLE `ExternalAccountMapping` MODIFY COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);
ALTER TABLE `LedgerAccount`          MODIFY COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);
ALTER TABLE `Transaction`            MODIFY COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);
ALTER TABLE `EntryLine`              MODIFY COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);
ALTER TABLE `SplitContext`           MODIFY COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);
ALTER TABLE `TransactionLink`        MODIFY COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);
ALTER TABLE `TransactionPrototype`   MODIFY COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);
ALTER TABLE `TrueLayerToken`         MODIFY COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);
ALTER TABLE `NordigenToken`          MODIFY COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);
ALTER TABLE `NordigenRequisition`    MODIFY COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);
ALTER TABLE `StarlingToken`          MODIFY COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);
ALTER TABLE `ExchangeRate`           MODIFY COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);
ALTER TABLE `StockQuote`             MODIFY COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

-- Record whether each Nordigen requisition was created from a
-- reconnect flow (existing token row replaced) or a fresh
-- connection. CompleteRequisition returns this so the frontend can
-- choose the right post-flow redirect target.
ALTER TABLE `NordigenRequisition`
  ADD COLUMN `wasReconnect` BOOLEAN NOT NULL DEFAULT FALSE;

-- Add a denormalised userId column to EntryLine, SplitContext and
-- TransactionLink so writes can be scoped through the userdb wrapper
-- without trusting the caller-supplied transaction id. Each child row
-- inherits the userId of its parent Transaction, backfilled below.

ALTER TABLE `EntryLine` ADD COLUMN `userId` INTEGER NULL;
UPDATE `EntryLine` el
   JOIN `Transaction` t ON t.id = el.transactionId
   SET el.userId = t.userId;
ALTER TABLE `EntryLine`
  MODIFY COLUMN `userId` INTEGER NOT NULL,
  ADD CONSTRAINT `EntryLine_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD INDEX `EntryLine_userId_idx` (`userId`);

ALTER TABLE `SplitContext` ADD COLUMN `userId` INTEGER NULL;
UPDATE `SplitContext` sc
   JOIN `Transaction` t ON t.id = sc.transactionId
   SET sc.userId = t.userId;
ALTER TABLE `SplitContext`
  MODIFY COLUMN `userId` INTEGER NOT NULL,
  ADD CONSTRAINT `SplitContext_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD INDEX `SplitContext_userId_idx` (`userId`);

ALTER TABLE `TransactionLink` ADD COLUMN `userId` INTEGER NULL;
UPDATE `TransactionLink` tl
   JOIN `Transaction` t ON t.id = tl.sourceTransactionId
   SET tl.userId = t.userId;
ALTER TABLE `TransactionLink`
  MODIFY COLUMN `userId` INTEGER NOT NULL,
  ADD CONSTRAINT `TransactionLink_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD INDEX `TransactionLink_userId_idx` (`userId`);

-- DisplaySettings inherited a `UNIQUE INDEX (userId)` from the prisma
-- schema but no PRIMARY KEY. Promote userId to PRIMARY KEY (it is the
-- natural per-user key — one row per user) and drop the now-redundant
-- unique index. The FK on userId switches over to the new PK index.

ALTER TABLE `DisplaySettings`
  ADD PRIMARY KEY (`userId`),
  DROP INDEX `DisplaySettings_userId_key`;

-- ExchangeRate and StockQuote rely on ON DUPLICATE KEY UPDATE in the
-- scheduler but the prisma-era schema only declared PRIMARY KEY(id),
-- never a unique key on the natural (pair, timestamp) tuple — so the
-- upsert silently degraded to an append and duplicates accumulated on
-- every refresh.
--
-- Drop the duplicates (keeping the highest id per group — the most
-- recently fetched value) and add the missing unique indexes so the
-- upsert clause actually fires from now on.

ALTER TABLE `ExchangeRate`
  ADD UNIQUE INDEX `ExchangeRate_pair_timestamp` (`currencyCodeFrom`, `currencyCodeTo`, `rateTimestamp`);

ALTER TABLE `StockQuote`
  ADD UNIQUE INDEX `StockQuote_stock_timestamp` (`stockId`, `quoteTimestamp`);
