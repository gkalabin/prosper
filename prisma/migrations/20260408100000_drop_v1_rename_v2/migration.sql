-- Drop V1 tables and rename V2 tables to clean names.
-- Order matters: drop FK constraints first, then tables, then rename.

-- ============================================================
-- 1. Drop V1 tables (in dependency order)
-- ============================================================

-- V1 join tables
DROP TABLE IF EXISTS `_TagToTransaction`;

-- V1 TransactionPrototype (references V1 Transaction)
DROP TABLE IF EXISTS `TransactionPrototype`;

-- V1 TransactionLink (references V1 Transaction)
DROP TABLE IF EXISTS `TransactionLink`;

-- V1 Transaction
DROP TABLE IF EXISTS `Transaction`;

-- V1 Tag
DROP TABLE IF EXISTS `Tag`;

-- ============================================================
-- 2. Rename V2 tables to clean names
-- ============================================================

RENAME TABLE `LedgerAccountV2` TO `LedgerAccount`;
RENAME TABLE `TransactionV2` TO `Transaction`;
RENAME TABLE `EntryLineV2` TO `EntryLine`;
RENAME TABLE `SplitContextV2` TO `SplitContext`;
RENAME TABLE `TransactionLinkV2` TO `TransactionLink`;
RENAME TABLE `TransactionPrototypeV2` TO `TransactionPrototype`;
RENAME TABLE `TagV2` TO `Tag`;
RENAME TABLE `_TagV2ToTransactionV2` TO `_TagToTransaction`;
