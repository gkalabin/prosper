-- A mapping's bank was always derived by joining BankAccount through the
-- internal account. Store the bankId on ExternalAccountMapping so provider
-- lookups, disconnects and the scheduler scan can address the bank directly.

-- 1. Add the column nullable so the backfill can populate it first.
ALTER TABLE `ExternalAccountMapping`
    ADD COLUMN `bankId` INTEGER NULL;

-- 2. Backfill from the mapped internal account's bank.
UPDATE `ExternalAccountMapping` m
    JOIN `BankAccount` a ON a.`id` = m.`internalAccountId`
    SET m.`bankId` = a.`bankId`;

-- 3. Enforce NOT NULL and reference the bank.
ALTER TABLE `ExternalAccountMapping`
    MODIFY COLUMN `bankId` INTEGER NOT NULL,
    ADD CONSTRAINT `ExternalAccountMapping_bankId_fkey`
        FOREIGN KEY (`bankId`) REFERENCES `Bank` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE;
