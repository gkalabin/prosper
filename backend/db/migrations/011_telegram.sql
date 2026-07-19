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
-- the settings page. PRIMARY KEY (userId) means minting again replaces
-- the previous token, so at most one is live per user.
CREATE TABLE IF NOT EXISTS `TelegramLinkToken` (
    `userId`    INTEGER  NOT NULL,
    -- base64url of 32 random bytes
    `token`     CHAR(43) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`userId`),
    UNIQUE INDEX `TelegramLinkToken_token` (`token`),
    CONSTRAINT `TelegramLinkToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Delivery log: one row per draft messaged to the user. messageText is
-- the rendered summary the Add tap verifies against. Holds no user
-- intent -- recorded/ignored state lives in TransactionOrigin and
-- IgnoredDraftOrigin.
CREATE TABLE IF NOT EXISTS `TelegramNotification` (
    `id`          INTEGER NOT NULL AUTO_INCREMENT,
    `userId`      INTEGER NOT NULL,
    `chatId`      BIGINT  NOT NULL,
    `messageText` VARCHAR(1024) NOT NULL,
    `createdAt`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    CONSTRAINT `TelegramNotification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- The origins a notification covers. The primary key is the dedup rule:
-- claiming an origin a second time fails the insert, so a draft can
-- never be messaged twice, even by concurrent notify runs.
CREATE TABLE IF NOT EXISTS `TelegramNotificationOrigin` (
    `userId`         INTEGER      NOT NULL,
    `originKind`     VARCHAR(32)  NOT NULL,
    `originKey`      VARCHAR(512) NOT NULL,
    `notificationId` INTEGER      NOT NULL,
    PRIMARY KEY (`userId`, `originKind`, `originKey`),
    CONSTRAINT `TelegramNotificationOrigin_notificationId_fkey` FOREIGN KEY (`notificationId`) REFERENCES `TelegramNotification` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `TelegramNotificationOrigin_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
