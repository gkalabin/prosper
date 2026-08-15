-- A user's linked Telegram chat: the destination for notifications and
-- the proof that inbound updates from this chat act for this user.
-- One chat per user; one user per chat.
CREATE TABLE IF NOT EXISTS `TelegramLink` (
    `userId`    INTEGER NOT NULL,
    `chatId`    BIGINT  NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`userId`),
    UNIQUE INDEX `TelegramLink_chatId` (`chatId`),
    CONSTRAINT `TelegramLink_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- The user's outstanding link token: single-use, short-lived, minted by
-- the settings page. PRIMARY KEY (userId) means at most one is live per
-- user; a token is replaced only once it has expired or been used.
CREATE TABLE IF NOT EXISTS `TelegramLinkToken` (
    `userId`    INTEGER  NOT NULL,
    `token`     CHAR(43) NOT NULL, -- base64url of 32 random bytes
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`userId`),
    UNIQUE INDEX `TelegramLinkToken_token` (`token`),
    CONSTRAINT `TelegramLinkToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- One row per draft messaged to the user.
-- Holds no user intent -- recorded/ignored state lives in TransactionOrigin and IgnoredDraftOrigin.
CREATE TABLE IF NOT EXISTS `TelegramNotification` (
    `id`        INTEGER NOT NULL AUTO_INCREMENT,
    `userId`    INTEGER NOT NULL,
    `chatId`    BIGINT  NOT NULL,
    `kind`      ENUM('EXPENSE', 'INCOME', 'TRANSFER') NOT NULL,
    `title`     VARCHAR(512) NOT NULL,
    `body`      TEXT         NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    CONSTRAINT `TelegramNotification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- The origins a notification covers.
CREATE TABLE IF NOT EXISTS `TelegramNotificationOrigin` (
    `userId`         INTEGER      NOT NULL,
    `originKind`     VARCHAR(32)  NOT NULL,
    `originKey`      VARCHAR(512) NOT NULL,
    `notificationId` INTEGER      NOT NULL,
    PRIMARY KEY (`userId`, `originKind`, `originKey`),
    CONSTRAINT `TelegramNotificationOrigin_notificationId_fkey` FOREIGN KEY (`notificationId`) REFERENCES `TelegramNotification` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `TelegramNotificationOrigin_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
