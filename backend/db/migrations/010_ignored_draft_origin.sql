-- IgnoredDraftOrigin tracks origin keys the user has explicitly
-- ignored (or un-ignored). Append-only: ignoring inserts active=true,
-- un-ignoring inserts active=false. The effective state is the latest
-- row per (userId, originKind, originKey) ordered by id.
CREATE TABLE IF NOT EXISTS `IgnoredDraftOrigin` (
    `id`         INTEGER      NOT NULL AUTO_INCREMENT,
    `userId`     INTEGER      NOT NULL,
    `originKind` VARCHAR(32)  NOT NULL,
    `originKey`  VARCHAR(512) NOT NULL,
    `active`     BOOLEAN      NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `IgnoredDraftOrigin_user` (`userId`),
    CONSTRAINT `IgnoredDraftOrigin_userId_fkey`
        FOREIGN KEY (`userId`) REFERENCES `User` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
