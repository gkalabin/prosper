-- Stock is uniquely identified by its (exchange, ticker) pair, so the numeric
-- `id` is redundant indirection. Drop it and promote (exchange, ticker) to the
-- primary key, replacing every `stockId` foreign key with the natural pair.

-- 1. Add the natural-key columns alongside the existing stockId (nullable so
--    the backfill can populate them before any constraint is enforced).
ALTER TABLE `BankAccount`
    ADD COLUMN `stockExchange` VARCHAR(191) NULL,
    ADD COLUMN `stockTicker`   VARCHAR(191) NULL;

ALTER TABLE `EntryLine`
    ADD COLUMN `stockExchange` VARCHAR(191) NULL,
    ADD COLUMN `stockTicker`   VARCHAR(191) NULL;

ALTER TABLE `StockQuote`
    ADD COLUMN `stockExchange` VARCHAR(191) NULL,
    ADD COLUMN `stockTicker`   VARCHAR(191) NULL;

-- 2. Backfill the pair from the referenced Stock row.
UPDATE `BankAccount` ba
    JOIN `Stock` s ON s.`id` = ba.`stockId`
    SET ba.`stockExchange` = s.`exchange`,
        ba.`stockTicker`   = s.`ticker`;

UPDATE `EntryLine` el
    JOIN `Stock` s ON s.`id` = el.`stockId`
    SET el.`stockExchange` = s.`exchange`,
        el.`stockTicker`   = s.`ticker`;

UPDATE `StockQuote` sq
    JOIN `Stock` s ON s.`id` = sq.`stockId`
    SET sq.`stockExchange` = s.`exchange`,
        sq.`stockTicker`   = s.`ticker`;

-- 3. Drop the stockId foreign keys and the quote uniqueness index that
--    references it.
ALTER TABLE `BankAccount` DROP FOREIGN KEY `BankAccount_stockId_fkey`;
ALTER TABLE `EntryLine` DROP FOREIGN KEY `EntryLine_stockId_fkey`;
ALTER TABLE `StockQuote` DROP FOREIGN KEY `StockQuote_stockId_fkey`;
ALTER TABLE `StockQuote` DROP INDEX `StockQuote_stock_timestamp`;

-- 4. Drop the now-unused stockId columns.
ALTER TABLE `BankAccount` DROP COLUMN `stockId`;
ALTER TABLE `EntryLine` DROP COLUMN `stockId`;
ALTER TABLE `StockQuote` DROP COLUMN `stockId`;

-- 5. Promote (exchange, ticker) to Stock's primary key.
ALTER TABLE `Stock`
    DROP PRIMARY KEY,
    DROP COLUMN `id`,
    ADD PRIMARY KEY (`exchange`, `ticker`);

-- 6. Quotes always belong to a stock; enforce NOT NULL and re-create the
--    foreign keys and uniqueness index against the natural key.
ALTER TABLE `StockQuote`
    MODIFY COLUMN `stockExchange` VARCHAR(191) NOT NULL,
    MODIFY COLUMN `stockTicker`   VARCHAR(191) NOT NULL;

ALTER TABLE `BankAccount`
    ADD CONSTRAINT `BankAccount_stock_fkey`
        FOREIGN KEY (`stockExchange`, `stockTicker`)
        REFERENCES `Stock` (`exchange`, `ticker`)
        ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `EntryLine`
    ADD CONSTRAINT `EntryLine_stock_fkey`
        FOREIGN KEY (`stockExchange`, `stockTicker`)
        REFERENCES `Stock` (`exchange`, `ticker`)
        ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `StockQuote`
    ADD CONSTRAINT `StockQuote_stock_fkey`
        FOREIGN KEY (`stockExchange`, `stockTicker`)
        REFERENCES `Stock` (`exchange`, `ticker`)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD UNIQUE INDEX `StockQuote_stock_timestamp` (`stockExchange`, `stockTicker`, `quoteTimestamp`);
