-- Demo Data for Prosper App
-- User: demo
-- Password: demo

-- 1. Create User
INSERT IGNORE INTO User (id, login, password, createdAt, updatedAt)
VALUES (1, 'demo', '$2b$10$MRlzOmiRB5dMDnIHTHSbUuJrZbsxMxJzEZDzF/czd4ik9QszTGFfa', NOW(), NOW());

-- 2. Display Settings
INSERT IGNORE INTO DisplaySettings (displayCurrencyCode, excludeCategoryIdsInStats, userId, createdAt, updatedAt)
VALUES ('USD', '', 1, NOW(), NOW());

-- 3. Banks
INSERT IGNORE INTO Bank (id, name, displayOrder, userId, createdAt, updatedAt) VALUES
(1, 'Chase Bank', 0, 1, NOW(), NOW());
INSERT IGNORE INTO Bank (id, name, displayOrder, userId, createdAt, updatedAt) VALUES
(2, 'HSBC', 1, 1, NOW(), NOW());

-- 4. Bank Accounts
INSERT IGNORE INTO BankAccount (id, name, bankId, currencyCode, displayOrder, archived, joint, initialBalanceCents, userId, createdAt, updatedAt)
VALUES (1, 'Checking Account', 1, 'USD', 0, 0, 0, 500000, 1, NOW(), NOW());
INSERT IGNORE INTO BankAccount (id, name, bankId, currencyCode, displayOrder, archived, joint, initialBalanceCents, userId, createdAt, updatedAt)
VALUES (2, 'Savings', 1, 'USD', 1, 0, 0, 2000000, 1, NOW(), NOW());
INSERT IGNORE INTO BankAccount (id, name, bankId, currencyCode, displayOrder, archived, joint, initialBalanceCents, userId, createdAt, updatedAt)
VALUES (3, 'Platinum Card', 1, 'USD', 2, 0, 0, 0, 1, NOW(), NOW());
INSERT IGNORE INTO BankAccount (id, name, bankId, currencyCode, displayOrder, archived, joint, initialBalanceCents, userId, createdAt, updatedAt)
VALUES (4, 'GBP Savings', 2, 'GBP', 3, 0, 0, 100000, 1, NOW(), NOW());

-- 5. Categories
INSERT IGNORE INTO Category (id, name, displayOrder, userId, createdAt, updatedAt)
    VALUES (1, 'Income', 0, 1, NOW(), NOW());
INSERT IGNORE INTO Category (id, name, displayOrder, parentCategoryId, userId, createdAt, updatedAt)
        VALUES (2, 'Salary', 0, 1, 1, NOW(), NOW());
INSERT IGNORE INTO Category (id, name, displayOrder, parentCategoryId, userId, createdAt, updatedAt)
        VALUES (3, 'Investment', 0, 1, 1, NOW(), NOW());
INSERT IGNORE INTO Category (id, name, displayOrder, parentCategoryId, userId, createdAt, updatedAt)
        VALUES (4, 'Other', 0, 1, 1, NOW(), NOW());
INSERT IGNORE INTO Category (id, name, displayOrder, userId, createdAt, updatedAt)
    VALUES (5, 'Housing', 0, 1, NOW(), NOW());
INSERT IGNORE INTO Category (id, name, displayOrder, parentCategoryId, userId, createdAt, updatedAt)
        VALUES (6, 'Rent & Mortgage', 0, 5, 1, NOW(), NOW());
INSERT IGNORE INTO Category (id, name, displayOrder, parentCategoryId, userId, createdAt, updatedAt)
        VALUES (7, 'Utilities', 0, 5, 1, NOW(), NOW());
INSERT IGNORE INTO Category (id, name, displayOrder, parentCategoryId, userId, createdAt, updatedAt)
        VALUES (8, 'Services', 0, 5, 1, NOW(), NOW());
INSERT IGNORE INTO Category (id, name, displayOrder, userId, createdAt, updatedAt)
    VALUES (9, 'Food', 0, 1, NOW(), NOW());
INSERT IGNORE INTO Category (id, name, displayOrder, parentCategoryId, userId, createdAt, updatedAt)
        VALUES (10, 'Groceries', 0, 9, 1, NOW(), NOW());
INSERT IGNORE INTO Category (id, name, displayOrder, parentCategoryId, userId, createdAt, updatedAt)
        VALUES (11, 'Eating Out', 0, 9, 1, NOW(), NOW());
INSERT IGNORE INTO Category (id, name, displayOrder, userId, createdAt, updatedAt)
    VALUES (12, 'Transport', 0, 1, NOW(), NOW());
INSERT IGNORE INTO Category (id, name, displayOrder, parentCategoryId, userId, createdAt, updatedAt)
        VALUES (13, 'Public Transport', 0, 12, 1, NOW(), NOW());
INSERT IGNORE INTO Category (id, name, displayOrder, parentCategoryId, userId, createdAt, updatedAt)
        VALUES (14, 'Car', 0, 12, 1, NOW(), NOW());
INSERT IGNORE INTO Category (id, name, displayOrder, parentCategoryId, userId, createdAt, updatedAt)
        VALUES (15, 'Taxi', 0, 12, 1, NOW(), NOW());
INSERT IGNORE INTO Category (id, name, displayOrder, userId, createdAt, updatedAt)
    VALUES (16, 'Shopping', 0, 1, NOW(), NOW());
INSERT IGNORE INTO Category (id, name, displayOrder, parentCategoryId, userId, createdAt, updatedAt)
        VALUES (17, 'Clothing', 0, 16, 1, NOW(), NOW());
INSERT IGNORE INTO Category (id, name, displayOrder, parentCategoryId, userId, createdAt, updatedAt)
        VALUES (18, 'Electronics', 0, 16, 1, NOW(), NOW());
INSERT IGNORE INTO Category (id, name, displayOrder, parentCategoryId, userId, createdAt, updatedAt)
        VALUES (19, 'Home', 0, 16, 1, NOW(), NOW());
INSERT IGNORE INTO Category (id, name, displayOrder, userId, createdAt, updatedAt)
    VALUES (20, 'Health & Wellness', 0, 1, NOW(), NOW());
INSERT IGNORE INTO Category (id, name, displayOrder, userId, createdAt, updatedAt)
    VALUES (21, 'Entertainment', 0, 1, NOW(), NOW());
INSERT IGNORE INTO Category (id, name, displayOrder, userId, createdAt, updatedAt)
    VALUES (22, 'Travel', 0, 1, NOW(), NOW());
INSERT IGNORE INTO Category (id, name, displayOrder, userId, createdAt, updatedAt)
    VALUES (23, 'Education', 0, 1, NOW(), NOW());
INSERT IGNORE INTO Category (id, name, displayOrder, userId, createdAt, updatedAt)
    VALUES (24, 'Financial', 0, 1, NOW(), NOW());
INSERT IGNORE INTO Category (id, name, displayOrder, parentCategoryId, userId, createdAt, updatedAt)
        VALUES (25, 'Taxes', 0, 24, 1, NOW(), NOW());
INSERT IGNORE INTO Category (id, name, displayOrder, parentCategoryId, userId, createdAt, updatedAt)
        VALUES (26, 'Fees', 0, 24, 1, NOW(), NOW());
INSERT IGNORE INTO Category (id, name, displayOrder, userId, createdAt, updatedAt)
    VALUES (27, 'Transfer', 0, 1, NOW(), NOW());

-- 6. Trip
INSERT IGNORE INTO Trip (id, name, country, city, destination, start, end, userId, createdAt, updatedAt)
VALUES (1, 'Paris Vacation', 'France', 'Paris', 'Paris', DATE_SUB(NOW(), INTERVAL 45 DAY), DATE_SUB(NOW(), INTERVAL 38 DAY), 1, NOW(), NOW());

-- 7. Transactions
INSERT IGNORE INTO Transaction (timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
VALUES (DATE_SUB(NOW(), INTERVAL 30 DAY), 'Salary', 2, 'INCOME', NULL, NULL, NULL, 1, 450000, 'USD', 1, NOW(), NOW(), 450000);
INSERT IGNORE INTO Transaction (timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
VALUES (DATE_SUB(NOW(), INTERVAL 60 DAY), 'Salary', 2, 'INCOME', NULL, NULL, NULL, 1, 450000, 'USD', 1, NOW(), NOW(), 450000);
INSERT IGNORE INTO Transaction (timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
VALUES (DATE_SUB(NOW(), INTERVAL 90 DAY), 'Salary', 2, 'INCOME', NULL, NULL, NULL, 1, 450000, 'USD', 1, NOW(), NOW(), 450000);
INSERT IGNORE INTO Transaction (timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
VALUES (DATE_SUB(NOW(), INTERVAL 30 DAY), 'Monthly Rent', 6, 'PERSONAL_EXPENSE', NULL, 1, 150000, NULL, NULL, 'USD', 1, NOW(), NOW(), 150000);
INSERT IGNORE INTO Transaction (timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
VALUES (DATE_SUB(NOW(), INTERVAL 60 DAY), 'Monthly Rent', 6, 'PERSONAL_EXPENSE', NULL, 1, 150000, NULL, NULL, 'USD', 1, NOW(), NOW(), 150000);
INSERT IGNORE INTO Transaction (timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
VALUES (DATE_SUB(NOW(), INTERVAL 90 DAY), 'Monthly Rent', 6, 'PERSONAL_EXPENSE', NULL, 1, 150000, NULL, NULL, 'USD', 1, NOW(), NOW(), 150000);
INSERT IGNORE INTO Transaction (timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
VALUES (DATE_SUB(NOW(), INTERVAL 2 DAY), 'Whole Foods', 10, 'PERSONAL_EXPENSE', NULL, 3, 14554, NULL, NULL, 'USD', 1, NOW(), NOW(), 14554);
INSERT IGNORE INTO Transaction (timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
VALUES (DATE_SUB(NOW(), INTERVAL 5 DAY), 'Chipotle', 11, 'PERSONAL_EXPENSE', NULL, 3, 1650, NULL, NULL, 'USD', 1, NOW(), NOW(), 1650);
INSERT IGNORE INTO Transaction (timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
VALUES (DATE_SUB(NOW(), INTERVAL 12 DAY), 'Starbucks', 11, 'PERSONAL_EXPENSE', NULL, 3, 580, NULL, NULL, 'USD', 1, NOW(), NOW(), 580);
INSERT IGNORE INTO Transaction (timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
VALUES (DATE_SUB(NOW(), INTERVAL 40 DAY), 'Louvre Ticket', 22, 'PERSONAL_EXPENSE', 1, 3, 2200, NULL, NULL, 'EUR', 1, NOW(), NOW(), 2200);
INSERT IGNORE INTO Transaction (timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
VALUES (DATE_SUB(NOW(), INTERVAL 41 DAY), 'Bistro Dinner', 22, 'PERSONAL_EXPENSE', 1, 3, 6500, NULL, NULL, 'EUR', 1, NOW(), NOW(), 6500);
INSERT IGNORE INTO Transaction (timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
VALUES (DATE_SUB(NOW(), INTERVAL 15 DAY), 'London Eye', 22, 'PERSONAL_EXPENSE', NULL, 4, 3000, NULL, NULL, 'GBP', 1, NOW(), NOW(), 3000);
