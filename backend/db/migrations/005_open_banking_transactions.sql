-- Persist open banking transactions and the fetches that produced them, so
-- reads come from the DB instead of calling providers live on every page load.

CREATE TABLE IF NOT EXISTS `OpenBankingFetch` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `internalAccountId` INTEGER NOT NULL,
    `provider` VARCHAR(32) NOT NULL,
    `trigger` ENUM('SCHEDULED', 'MANUAL') NOT NULL,
    `status` ENUM('SUCCESS', 'ERROR') NOT NULL,
    `error` VARCHAR(1024) NULL,
    `txCount` INTEGER NOT NULL DEFAULT 0,
    `startedAt` DATETIME(3) NOT NULL,
    `finishedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`),
    INDEX `OpenBankingFetch_user_account_started` (`userId`, `internalAccountId`, `startedAt`),
    CONSTRAINT `OpenBankingFetch_accountId_fkey` FOREIGN KEY (`internalAccountId`) REFERENCES `BankAccount` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `OpenBankingFetch_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `OpenBankingTransaction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `externalTransactionId` VARCHAR(191) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL,
    `description` VARCHAR(512) NOT NULL DEFAULT '',
    `signedAmountNanos` BIGINT NOT NULL,
    `raw` JSON NOT NULL,
    `rawHash` CHAR(64) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    UNIQUE INDEX `OpenBankingTransaction_rawHash` (`userId`, `rawHash`),
    CONSTRAINT `OpenBankingTransaction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Cross table linking each fetch to the transactions it returned. Because
-- transactions are deduplicated on their raw json hash, one transaction row
-- can belong to several fetches.
CREATE TABLE IF NOT EXISTS `OpenBankingFetchTransaction` (
    `userId` INTEGER NOT NULL,
    `fetchId` INTEGER NOT NULL,
    `openBankingTransactionId` INTEGER NOT NULL,

    PRIMARY KEY (`fetchId`, `openBankingTransactionId`),
    INDEX `OpenBankingFetchTransaction_transaction` (`openBankingTransactionId`),
    CONSTRAINT `OpenBankingFetchTransaction_fetchId_fkey` FOREIGN KEY (`fetchId`) REFERENCES `OpenBankingFetch` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `OpenBankingFetchTransaction_transactionId_fkey` FOREIGN KEY (`openBankingTransactionId`) REFERENCES `OpenBankingTransaction` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `OpenBankingFetchTransaction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
