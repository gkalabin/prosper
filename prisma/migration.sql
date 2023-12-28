-- UPDATE StockQuote AS q SET currencyCode=(SELECT name from Currency AS c where c.id=q.currencyId);
-- UPDATE ExchangeRate AS e SET currencyCodeFrom=(SELECT name from Currency AS c where c.id=e.currencyFromId), currencyCodeTo=(SELECT name from Currency AS c where c.id=e.currencyToId);
-- UPDATE DisplaySettings AS q SET displayCurrencyCode=(SELECT name from Currency AS c where c.id=q.displayCurrencyId);
-- UPDATE BankAccount AS q SET currencyCode=(SELECT name from Currency AS c where c.id=q.currencyId);
-- UPDATE ThirdPartyExpense AS q SET currencyCode=(SELECT name from Currency AS c where c.id=q.currencyId);
-- insert into Stock (name, ticker, exchange, currencyCode, updatedAt) VALUES ("Alphabet Inc.", "GOOG", "NMS", "USD", CURRENT_TIMESTAMP);
-- update BankAccount SET currencyCode=null, stockId=1 where id=100;
-- update StockQuote set stockId=1;
-- INSERT INTO Currency (id, name, updatedAt) VALUES (7354, "UNUSED_CURRENCY", CURRENT_TIMESTAMP);
-- update StockQuote set stockId=1 where stockId is NULL;
-- Alter table Transaction
--   ADD COLUMN `currencyCode` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
--   ADD COLUMN `incomingAccountId` int DEFAULT NULL,
--   ADD COLUMN `incomingAmountCents` int DEFAULT NULL,
--   ADD COLUMN `otherPartyName` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
--   ADD COLUMN `outgoingAccountId` int DEFAULT NULL,
--   ADD COLUMN `outgoingAmountCents` int DEFAULT NULL,
--   ADD COLUMN `ownShareAmountCents` int DEFAULT NULL,
--   ADD COLUMN `payer` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
--   ADD COLUMN `payerOutgoingAmountCents` int DEFAULT NULL,
--   ADD COLUMN `transactionType` enum('PERSONAL_EXPENSE','THIRD_PARTY_EXPENSE','INCOME','TRANSFER') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
--   ADD COLUMN `tripId` int DEFAULT NULL,
--   ADD COLUMN `vendor` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL;


-- update Transaction t
--     inner join PersonalExpense e on t.id = e.transactionId
-- set t.transactionType = 'PERSONAL_EXPENSE',
--     t.vendor = e.vendor,
--     t.otherPartyName = e.otherPartyName,
--     t.ownShareAmountCents = e.ownShareAmountCents,
--     t.tripId = e.tripId,
--     t.outgoingAmountCents = t.amountCents,
--     t.outgoingAccountId = e.accountId;

-- update Transaction t
--     inner join ThirdPartyExpense e on t.id = e.transactionId
-- set t.transactionType = 'THIRD_PARTY_EXPENSE',
--     t.vendor = e.vendor,
--     t.payer = e.payer,
--     t.ownShareAmountCents = e.ownShareAmountCents,
--     t.payerOutgoingAmountCents = t.amountCents,
--     t.tripId = e.tripId,
--     t.currencyCode = e.currencyCode;

-- update Transaction t
--     inner join Income e on t.id = e.transactionId
-- set t.transactionType = 'INCOME',
--     t.payer = e.payer,
--     t.otherPartyName = e.otherPartyName,
--     t.ownShareAmountCents = e.ownShareAmountCents,
--     t.incomingAmountCents = t.amountCents,
--     t.incomingAccountId = e.accountId;

-- update Transaction t
--     inner join Transfer e on t.id = e.transactionId
-- set t.transactionType = 'TRANSFER',
--     t.incomingAmountCents = e.receivedAmountCents,
--     t.incomingAccountId = e.accountToId,
--     t.outgoingAmountCents = t.amountCents,
--     t.outgoingAccountId = e.accountFromId;

-- ALTER TABLE Transaction MODIFY `transactionType` enum('PERSONAL_EXPENSE','THIRD_PARTY_EXPENSE','INCOME','TRANSFER') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `id`;
-- ALTER TABLE Transaction MODIFY `timestamp` datetime(3) NOT NULL AFTER `transactionType`;
-- ALTER TABLE Transaction MODIFY `vendor` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `timestamp`;
-- ALTER TABLE Transaction MODIFY `payer` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `vendor`;
-- ALTER TABLE Transaction MODIFY `description` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL AFTER `payer`;
-- ALTER TABLE Transaction MODIFY `categoryId` int NOT NULL AFTER `description`;
-- ALTER TABLE Transaction MODIFY `outgoingAccountId` int DEFAULT NULL AFTER `categoryId`;
-- ALTER TABLE Transaction MODIFY `outgoingAmountCents` int DEFAULT NULL AFTER `outgoingAccountId`;
-- ALTER TABLE Transaction MODIFY `incomingAccountId` int DEFAULT NULL AFTER `outgoingAmountCents`;
-- ALTER TABLE Transaction MODIFY `incomingAmountCents` int DEFAULT NULL AFTER `incomingAccountId`;
-- ALTER TABLE Transaction MODIFY `currencyCode` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `incomingAmountCents`;
-- ALTER TABLE Transaction MODIFY `payerOutgoingAmountCents` int DEFAULT NULL AFTER `currencyCode`;
-- ALTER TABLE Transaction MODIFY `otherPartyName` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `payerOutgoingAmountCents`;
-- ALTER TABLE Transaction MODIFY `ownShareAmountCents` int DEFAULT NULL AFTER `otherPartyName`;
-- ALTER TABLE Transaction MODIFY `tripId` int DEFAULT NULL AFTER `ownShareAmountCents`;
-- ALTER TABLE Transaction MODIFY `transactionToBeRepayedId` int DEFAULT NULL AFTER `tripId`;
-- ALTER TABLE Transaction MODIFY `userId` int NOT NULL AFTER `transactionToBeRepayedId`;
-- ALTER TABLE Transaction MODIFY `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) AFTER `userId`;
-- ALTER TABLE Transaction MODIFY `updatedAt` datetime(3) NOT NULL AFTER `createdAt`;
-- ALTER TABLE Transaction MODIFY `amountCents` int NOT NULL AFTER `updatedAt`;
