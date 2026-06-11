-- Store all amounts in nanos (1 unit = 10^9 nanos).
-- BankAccount.initialBalanceCents (cents) becomes initialBalanceNanos.
ALTER TABLE `BankAccount` ADD COLUMN `initialBalanceNanos` BIGINT NOT NULL DEFAULT 0;

UPDATE `BankAccount` SET `initialBalanceNanos` = CAST(`initialBalanceCents` AS SIGNED) * 10000000;

ALTER TABLE `BankAccount` DROP COLUMN `initialBalanceCents`;

-- StockQuote.value (cents) becomes valueNanos.
ALTER TABLE `StockQuote` ADD COLUMN `valueNanos` BIGINT NULL;

UPDATE `StockQuote` SET `valueNanos` = `value` * 10000000;

ALTER TABLE `StockQuote` DROP COLUMN `value`;
