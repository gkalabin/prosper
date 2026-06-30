-- Record the account balance each fetch reads from the provider alongside the
-- transactions, so the latest known balance is served from the DB instead of
-- calling providers live on every page load.

ALTER TABLE `OpenBankingFetch`
    ADD COLUMN `balanceNanos` BIGINT NULL AFTER `txCount`;
