-- Rename the prisma-generated implicit M:N table `_TagToTransaction`
-- (with opaque columns `A`/`B`) to `TagTransaction` with descriptive
-- `tagId`/`transactionId` columns. The underlying unique and secondary
-- indexes are renamed in place; the foreign keys are dropped and
-- re-added because MySQL has no rename-constraint syntax.

ALTER TABLE `_TagToTransaction`
  DROP FOREIGN KEY `_TagV2ToTransactionV2_A_fkey`,
  DROP FOREIGN KEY `_TagV2ToTransactionV2_B_fkey`;

RENAME TABLE `_TagToTransaction` TO `TagTransaction`;

ALTER TABLE `TagTransaction`
  RENAME COLUMN `A` TO `tagId`,
  RENAME COLUMN `B` TO `transactionId`,
  RENAME INDEX `_TagToTransaction_AB_unique` TO `TagTransaction_tagId_transactionId_unique`,
  RENAME INDEX `_TagToTransaction_B_index` TO `TagTransaction_transactionId_index`,
  ADD CONSTRAINT `TagTransaction_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `Tag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `TagTransaction_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `Transaction`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
