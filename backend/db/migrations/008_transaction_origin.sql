-- A TransactionOrigin records which external event a transaction was
-- recorded from. Until now the event was identified by its external id
-- alone, implicitly an open banking transaction. Storing the kind of
-- source alongside a generic key lets other draft sources record their
-- origin too, so usage intelligence can later be built per source.

-- 1. The raw statement text the origin used to duplicate is recovered from
-- the stored bank transaction by external id, so the column is no longer
-- needed.
ALTER TABLE `TransactionPrototype` DROP COLUMN `externalDescription`;

-- 2. Rename the table: it records where a transaction came from, not a
-- prototype to duplicate.
RENAME TABLE `TransactionPrototype` TO `TransactionOrigin`;

-- 3. Add the column nullable so existing rows can be backfilled first.
ALTER TABLE `TransactionOrigin`
    ADD COLUMN `originKind` ENUM('OPEN_BANKING') NULL;

-- 4. Every existing row was recorded from an open banking transaction.
UPDATE `TransactionOrigin` SET `originKind` = 'OPEN_BANKING';

-- 5. Enforce NOT NULL now that every row has a kind.
ALTER TABLE `TransactionOrigin`
    MODIFY COLUMN `originKind` ENUM('OPEN_BANKING') NOT NULL;

-- 6. The id identifies the event within its source, not just an open
-- banking transaction; name it generically.
ALTER TABLE `TransactionOrigin`
    RENAME COLUMN `externalId` TO `originKey`;

-- 7. A source event may be recorded by a transaction at most once. Without
-- this constraint a racing double insert links the same event to the same
-- transaction twice, which makes recall double-count the recorded ids.
ALTER TABLE `TransactionOrigin`
    ADD UNIQUE INDEX `TransactionOrigin_event`
        (`userId`, `originKind`, `originKey`, `internalTransactionId`);
