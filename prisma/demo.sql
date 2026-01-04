INSERT IGNORE INTO User (id, login, password, createdAt, updatedAt)
VALUES (1, 'demo', '$2b$10$MRlzOmiRB5dMDnIHTHSbUuJrZbsxMxJzEZDzF/czd4ik9QszTGFfa', NOW(), NOW());
INSERT IGNORE INTO DisplaySettings (displayCurrencyCode, excludeCategoryIdsInStats, userId, createdAt, updatedAt)
VALUES ('USD', '', 1, NOW(), NOW());
INSERT IGNORE INTO Bank (id, name, displayOrder, userId, createdAt, updatedAt) VALUES
(1, 'Main Street Bank', 0, 1, NOW(), NOW());
INSERT IGNORE INTO Bank (id, name, displayOrder, userId, createdAt, updatedAt) VALUES
(2, 'Global Investments', 1, 1, NOW(), NOW());
INSERT IGNORE INTO BankAccount (id, name, bankId, currencyCode, displayOrder, archived, joint, initialBalanceCents, userId, createdAt, updatedAt)
VALUES (1, 'Checking Account', 1, 'USD', 0, 0, 0, 500000, 1, NOW(), NOW());
INSERT IGNORE INTO BankAccount (id, name, bankId, currencyCode, displayOrder, archived, joint, initialBalanceCents, userId, createdAt, updatedAt)
VALUES (2, 'Savings', 1, 'USD', 1, 0, 0, 2000000, 1, NOW(), NOW());
INSERT IGNORE INTO BankAccount (id, name, bankId, currencyCode, displayOrder, archived, joint, initialBalanceCents, userId, createdAt, updatedAt)
VALUES (3, 'Platinum Card', 1, 'USD', 2, 0, 0, 0, 1, NOW(), NOW());
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
INSERT IGNORE INTO Trip (id, name, country, city, destination, start, end, userId, createdAt, updatedAt)
VALUES (1, 'Paris Vacation', 'France', 'Paris', 'Paris', DATE_SUB(NOW(), INTERVAL 45 DAY), DATE_SUB(NOW(), INTERVAL 38 DAY), 1, NOW(), NOW());
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (1, DATE_SUB(NOW(), INTERVAL 89 DAY), "Safeway", 10, 'PERSONAL_EXPENSE', NULL, 3, 12619, NULL, NULL, 'USD', 1, NOW(), NOW(), 12619);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (2, DATE_SUB(NOW(), INTERVAL 89 DAY), "Starbucks", 11, 'PERSONAL_EXPENSE', NULL, 3, 568, NULL, NULL, 'USD', 1, NOW(), NOW(), 568);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (3, DATE_SUB(NOW(), INTERVAL 87 DAY), "Starbucks", 11, 'PERSONAL_EXPENSE', NULL, 3, 758, NULL, NULL, 'USD', 1, NOW(), NOW(), 758);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (4, DATE_SUB(NOW(), INTERVAL 86 DAY), "Electric Bill", 7, 'PERSONAL_EXPENSE', NULL, 1, 8500, NULL, NULL, 'USD', 1, NOW(), NOW(), 8500);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (5, DATE_SUB(NOW(), INTERVAL 86 DAY), "Whole Foods", 10, 'PERSONAL_EXPENSE', NULL, 3, 13135, NULL, NULL, 'USD', 1, NOW(), NOW(), 13135);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (6, DATE_SUB(NOW(), INTERVAL 86 DAY), "Starbucks", 11, 'PERSONAL_EXPENSE', NULL, 3, 810, NULL, NULL, 'USD', 1, NOW(), NOW(), 810);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (7, DATE_SUB(NOW(), INTERVAL 82 DAY), "Chipotle", 11, 'PERSONAL_EXPENSE', NULL, 3, 1731, NULL, NULL, 'USD', 1, NOW(), NOW(), 1731);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (8, DATE_SUB(NOW(), INTERVAL 79 DAY), "Trader Joes", 10, 'PERSONAL_EXPENSE', NULL, 3, 6475, NULL, NULL, 'USD', 1, NOW(), NOW(), 6475);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (9, DATE_SUB(NOW(), INTERVAL 78 DAY), "Local Cafe", 11, 'PERSONAL_EXPENSE', NULL, 3, 1360, NULL, NULL, 'USD', 1, NOW(), NOW(), 1360);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (10, DATE_SUB(NOW(), INTERVAL 76 DAY), "Local Cafe", 11, 'PERSONAL_EXPENSE', NULL, 3, 1148, NULL, NULL, 'USD', 1, NOW(), NOW(), 1148);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (11, DATE_SUB(NOW(), INTERVAL 74 DAY), "Whole Foods", 10, 'PERSONAL_EXPENSE', NULL, 3, 9206, NULL, NULL, 'USD', 1, NOW(), NOW(), 9206);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (12, DATE_SUB(NOW(), INTERVAL 74 DAY), "Chipotle", 11, 'PERSONAL_EXPENSE', NULL, 3, 1793, NULL, NULL, 'USD', 1, NOW(), NOW(), 1793);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (13, DATE_SUB(NOW(), INTERVAL 73 DAY), "Local Cafe", 11, 'PERSONAL_EXPENSE', NULL, 3, 1866, NULL, NULL, 'USD', 1, NOW(), NOW(), 1866);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (14, DATE_SUB(NOW(), INTERVAL 72 DAY), "Subway", 11, 'PERSONAL_EXPENSE', NULL, 3, 892, NULL, NULL, 'USD', 1, NOW(), NOW(), 892);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (15, DATE_SUB(NOW(), INTERVAL 71 DAY), "Chipotle", 11, 'PERSONAL_EXPENSE', NULL, 3, 1595, NULL, NULL, 'USD', 1, NOW(), NOW(), 1595);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (16, DATE_SUB(NOW(), INTERVAL 70 DAY), "Subway", 11, 'PERSONAL_EXPENSE', NULL, 3, 703, NULL, NULL, 'USD', 1, NOW(), NOW(), 703);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (17, DATE_SUB(NOW(), INTERVAL 67 DAY), "Subway", 11, 'PERSONAL_EXPENSE', NULL, 3, 635, NULL, NULL, 'USD', 1, NOW(), NOW(), 635);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (18, DATE_SUB(NOW(), INTERVAL 65 DAY), "Safeway", 10, 'PERSONAL_EXPENSE', NULL, 3, 14034, NULL, NULL, 'USD', 1, NOW(), NOW(), 14034);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (19, DATE_SUB(NOW(), INTERVAL 65 DAY), "Local Cafe", 11, 'PERSONAL_EXPENSE', NULL, 3, 859, NULL, NULL, 'USD', 1, NOW(), NOW(), 859);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (20, DATE_SUB(NOW(), INTERVAL 64 DAY), "Salary", 2, 'INCOME', NULL, NULL, NULL, 1, 450000, 'USD', 1, NOW(), NOW(), 450000);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (21, DATE_SUB(NOW(), INTERVAL 64 DAY), "Monthly Rent", 6, 'PERSONAL_EXPENSE', NULL, 1, 150000, NULL, NULL, 'USD', 1, NOW(), NOW(), 150000);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (22, DATE_SUB(NOW(), INTERVAL 63 DAY), "Subway", 11, 'PERSONAL_EXPENSE', NULL, 3, 1057, NULL, NULL, 'USD', 1, NOW(), NOW(), 1057);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (23, DATE_SUB(NOW(), INTERVAL 61 DAY), "Local Cafe", 11, 'PERSONAL_EXPENSE', NULL, 3, 1515, NULL, NULL, 'USD', 1, NOW(), NOW(), 1515);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (24, DATE_SUB(NOW(), INTERVAL 58 DAY), "Starbucks", 11, 'PERSONAL_EXPENSE', NULL, 3, 1593, NULL, NULL, 'USD', 1, NOW(), NOW(), 1593);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (25, DATE_SUB(NOW(), INTERVAL 57 DAY), "Safeway", 10, 'PERSONAL_EXPENSE', NULL, 3, 13881, NULL, NULL, 'USD', 1, NOW(), NOW(), 13881);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (26, DATE_SUB(NOW(), INTERVAL 55 DAY), "Electric Bill", 7, 'PERSONAL_EXPENSE', NULL, 1, 8500, NULL, NULL, 'USD', 1, NOW(), NOW(), 8500);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (27, DATE_SUB(NOW(), INTERVAL 55 DAY), "Starbucks", 11, 'PERSONAL_EXPENSE', NULL, 3, 1532, NULL, NULL, 'USD', 1, NOW(), NOW(), 1532);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (28, DATE_SUB(NOW(), INTERVAL 52 DAY), "Starbucks", 11, 'PERSONAL_EXPENSE', NULL, 3, 1743, NULL, NULL, 'USD', 1, NOW(), NOW(), 1743);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (29, DATE_SUB(NOW(), INTERVAL 50 DAY), "Subway", 11, 'PERSONAL_EXPENSE', NULL, 3, 1192, NULL, NULL, 'USD', 1, NOW(), NOW(), 1192);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (30, DATE_SUB(NOW(), INTERVAL 49 DAY), "Safeway", 10, 'PERSONAL_EXPENSE', NULL, 3, 9887, NULL, NULL, 'USD', 1, NOW(), NOW(), 9887);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (31, DATE_SUB(NOW(), INTERVAL 49 DAY), "Local Cafe", 11, 'PERSONAL_EXPENSE', NULL, 3, 1860, NULL, NULL, 'USD', 1, NOW(), NOW(), 1860);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (32, DATE_SUB(NOW(), INTERVAL 47 DAY), "Safeway", 10, 'PERSONAL_EXPENSE', NULL, 3, 9834, NULL, NULL, 'USD', 1, NOW(), NOW(), 9834);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (33, DATE_SUB(NOW(), INTERVAL 47 DAY), "Starbucks", 11, 'PERSONAL_EXPENSE', NULL, 3, 1868, NULL, NULL, 'USD', 1, NOW(), NOW(), 1868);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (34, DATE_SUB(NOW(), INTERVAL 46 DAY), "Trader Joes", 10, 'PERSONAL_EXPENSE', NULL, 3, 9570, NULL, NULL, 'USD', 1, NOW(), NOW(), 9570);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (35, DATE_SUB(NOW(), INTERVAL 45 DAY), "Local Cafe", 11, 'PERSONAL_EXPENSE', NULL, 3, 1587, NULL, NULL, 'USD', 1, NOW(), NOW(), 1587);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (36, DATE_SUB(NOW(), INTERVAL 45 DAY), "Croissant Shop", 22, 'PERSONAL_EXPENSE', 1, 3, 6006, NULL, NULL, 'EUR', 1, NOW(), NOW(), 6006);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (37, DATE_SUB(NOW(), INTERVAL 44 DAY), "Chipotle", 11, 'PERSONAL_EXPENSE', NULL, 3, 1263, NULL, NULL, 'USD', 1, NOW(), NOW(), 1263);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (38, DATE_SUB(NOW(), INTERVAL 43 DAY), "Chipotle", 11, 'PERSONAL_EXPENSE', NULL, 3, 879, NULL, NULL, 'USD', 1, NOW(), NOW(), 879);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (39, DATE_SUB(NOW(), INTERVAL 43 DAY), "Bistro Paris", 22, 'PERSONAL_EXPENSE', 1, 3, 3574, NULL, NULL, 'EUR', 1, NOW(), NOW(), 3574);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (40, DATE_SUB(NOW(), INTERVAL 42 DAY), "Subway", 11, 'PERSONAL_EXPENSE', NULL, 3, 562, NULL, NULL, 'USD', 1, NOW(), NOW(), 562);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (41, DATE_SUB(NOW(), INTERVAL 42 DAY), "Croissant Shop", 22, 'PERSONAL_EXPENSE', 1, 3, 2845, NULL, NULL, 'EUR', 1, NOW(), NOW(), 2845);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (42, DATE_SUB(NOW(), INTERVAL 41 DAY), "Louvre Museum", 22, 'PERSONAL_EXPENSE', 1, 3, 7379, NULL, NULL, 'EUR', 1, NOW(), NOW(), 7379);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (43, DATE_SUB(NOW(), INTERVAL 40 DAY), "Louvre Museum", 22, 'PERSONAL_EXPENSE', 1, 3, 2659, NULL, NULL, 'EUR', 1, NOW(), NOW(), 2659);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (44, DATE_SUB(NOW(), INTERVAL 39 DAY), "Chipotle", 11, 'PERSONAL_EXPENSE', NULL, 3, 901, NULL, NULL, 'USD', 1, NOW(), NOW(), 901);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (45, DATE_SUB(NOW(), INTERVAL 39 DAY), "Louvre Museum", 22, 'PERSONAL_EXPENSE', 1, 3, 9068, NULL, NULL, 'EUR', 1, NOW(), NOW(), 9068);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (46, DATE_SUB(NOW(), INTERVAL 38 DAY), "Subway", 11, 'PERSONAL_EXPENSE', NULL, 3, 1004, NULL, NULL, 'USD', 1, NOW(), NOW(), 1004);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (47, DATE_SUB(NOW(), INTERVAL 38 DAY), "Louvre Museum", 22, 'PERSONAL_EXPENSE', 1, 3, 5428, NULL, NULL, 'EUR', 1, NOW(), NOW(), 5428);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (48, DATE_SUB(NOW(), INTERVAL 37 DAY), "Starbucks", 11, 'PERSONAL_EXPENSE', NULL, 3, 838, NULL, NULL, 'USD', 1, NOW(), NOW(), 838);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (49, DATE_SUB(NOW(), INTERVAL 36 DAY), "Starbucks", 11, 'PERSONAL_EXPENSE', NULL, 3, 1791, NULL, NULL, 'USD', 1, NOW(), NOW(), 1791);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (50, DATE_SUB(NOW(), INTERVAL 35 DAY), "Starbucks", 11, 'PERSONAL_EXPENSE', NULL, 3, 1376, NULL, NULL, 'USD', 1, NOW(), NOW(), 1376);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (51, DATE_SUB(NOW(), INTERVAL 34 DAY), "Salary", 2, 'INCOME', NULL, NULL, NULL, 1, 450000, 'USD', 1, NOW(), NOW(), 450000);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (52, DATE_SUB(NOW(), INTERVAL 34 DAY), "Monthly Rent", 6, 'PERSONAL_EXPENSE', NULL, 1, 150000, NULL, NULL, 'USD', 1, NOW(), NOW(), 150000);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (53, DATE_SUB(NOW(), INTERVAL 34 DAY), "Chipotle", 11, 'PERSONAL_EXPENSE', NULL, 3, 961, NULL, NULL, 'USD', 1, NOW(), NOW(), 961);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (54, DATE_SUB(NOW(), INTERVAL 33 DAY), "Subway", 11, 'PERSONAL_EXPENSE', NULL, 3, 623, NULL, NULL, 'USD', 1, NOW(), NOW(), 623);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (55, DATE_SUB(NOW(), INTERVAL 32 DAY), "Whole Foods", 10, 'PERSONAL_EXPENSE', NULL, 3, 12319, NULL, NULL, 'USD', 1, NOW(), NOW(), 12319);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (56, DATE_SUB(NOW(), INTERVAL 32 DAY), "Subway", 11, 'PERSONAL_EXPENSE', NULL, 3, 763, NULL, NULL, 'USD', 1, NOW(), NOW(), 763);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (57, DATE_SUB(NOW(), INTERVAL 29 DAY), "Subway", 11, 'PERSONAL_EXPENSE', NULL, 3, 1454, NULL, NULL, 'USD', 1, NOW(), NOW(), 1454);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (58, DATE_SUB(NOW(), INTERVAL 27 DAY), "Trader Joes", 10, 'PERSONAL_EXPENSE', NULL, 3, 14559, NULL, NULL, 'USD', 1, NOW(), NOW(), 14559);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (59, DATE_SUB(NOW(), INTERVAL 27 DAY), "Subway", 11, 'PERSONAL_EXPENSE', NULL, 3, 1715, NULL, NULL, 'USD', 1, NOW(), NOW(), 1715);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (60, DATE_SUB(NOW(), INTERVAL 26 DAY), "Starbucks", 11, 'PERSONAL_EXPENSE', NULL, 3, 547, NULL, NULL, 'USD', 1, NOW(), NOW(), 547);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (61, DATE_SUB(NOW(), INTERVAL 25 DAY), "Electric Bill", 7, 'PERSONAL_EXPENSE', NULL, 1, 8500, NULL, NULL, 'USD', 1, NOW(), NOW(), 8500);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (62, DATE_SUB(NOW(), INTERVAL 24 DAY), "Chipotle", 11, 'PERSONAL_EXPENSE', NULL, 3, 1562, NULL, NULL, 'USD', 1, NOW(), NOW(), 1562);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (63, DATE_SUB(NOW(), INTERVAL 22 DAY), "Chipotle", 11, 'PERSONAL_EXPENSE', NULL, 3, 1366, NULL, NULL, 'USD', 1, NOW(), NOW(), 1366);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (64, DATE_SUB(NOW(), INTERVAL 21 DAY), "Subway", 11, 'PERSONAL_EXPENSE', NULL, 3, 1576, NULL, NULL, 'USD', 1, NOW(), NOW(), 1576);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (65, DATE_SUB(NOW(), INTERVAL 20 DAY), "Safeway", 10, 'PERSONAL_EXPENSE', NULL, 3, 12036, NULL, NULL, 'USD', 1, NOW(), NOW(), 12036);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (66, DATE_SUB(NOW(), INTERVAL 20 DAY), "Subway", 11, 'PERSONAL_EXPENSE', NULL, 3, 1078, NULL, NULL, 'USD', 1, NOW(), NOW(), 1078);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (67, DATE_SUB(NOW(), INTERVAL 19 DAY), "Starbucks", 11, 'PERSONAL_EXPENSE', NULL, 3, 548, NULL, NULL, 'USD', 1, NOW(), NOW(), 548);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (68, DATE_SUB(NOW(), INTERVAL 17 DAY), "Subway", 11, 'PERSONAL_EXPENSE', NULL, 3, 1515, NULL, NULL, 'USD', 1, NOW(), NOW(), 1515);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (69, DATE_SUB(NOW(), INTERVAL 15 DAY), "Starbucks", 11, 'PERSONAL_EXPENSE', NULL, 3, 518, NULL, NULL, 'USD', 1, NOW(), NOW(), 518);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (70, DATE_SUB(NOW(), INTERVAL 14 DAY), "Whole Foods", 10, 'PERSONAL_EXPENSE', NULL, 3, 12894, NULL, NULL, 'USD', 1, NOW(), NOW(), 12894);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (71, DATE_SUB(NOW(), INTERVAL 14 DAY), "Subway", 11, 'PERSONAL_EXPENSE', NULL, 3, 1916, NULL, NULL, 'USD', 1, NOW(), NOW(), 1916);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (72, DATE_SUB(NOW(), INTERVAL 13 DAY), "Subway", 11, 'PERSONAL_EXPENSE', NULL, 3, 1665, NULL, NULL, 'USD', 1, NOW(), NOW(), 1665);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (73, DATE_SUB(NOW(), INTERVAL 11 DAY), "Safeway", 10, 'PERSONAL_EXPENSE', NULL, 3, 14458, NULL, NULL, 'USD', 1, NOW(), NOW(), 14458);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (74, DATE_SUB(NOW(), INTERVAL 11 DAY), "Local Cafe", 11, 'PERSONAL_EXPENSE', NULL, 3, 928, NULL, NULL, 'USD', 1, NOW(), NOW(), 928);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (75, DATE_SUB(NOW(), INTERVAL 9 DAY), "Chipotle", 11, 'PERSONAL_EXPENSE', NULL, 3, 1158, NULL, NULL, 'USD', 1, NOW(), NOW(), 1158);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (76, DATE_SUB(NOW(), INTERVAL 8 DAY), "Chipotle", 11, 'PERSONAL_EXPENSE', NULL, 3, 1865, NULL, NULL, 'USD', 1, NOW(), NOW(), 1865);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (77, DATE_SUB(NOW(), INTERVAL 7 DAY), "Chipotle", 11, 'PERSONAL_EXPENSE', NULL, 3, 1776, NULL, NULL, 'USD', 1, NOW(), NOW(), 1776);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (78, DATE_SUB(NOW(), INTERVAL 6 DAY), "Local Cafe", 11, 'PERSONAL_EXPENSE', NULL, 3, 1503, NULL, NULL, 'USD', 1, NOW(), NOW(), 1503);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (79, DATE_SUB(NOW(), INTERVAL 3 DAY), "Salary", 2, 'INCOME', NULL, NULL, NULL, 1, 450000, 'USD', 1, NOW(), NOW(), 450000);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (80, DATE_SUB(NOW(), INTERVAL 3 DAY), "Monthly Rent", 6, 'PERSONAL_EXPENSE', NULL, 1, 150000, NULL, NULL, 'USD', 1, NOW(), NOW(), 150000);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (81, DATE_SUB(NOW(), INTERVAL 3 DAY), "Safeway", 10, 'PERSONAL_EXPENSE', NULL, 3, 10212, NULL, NULL, 'USD', 1, NOW(), NOW(), 10212);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (82, DATE_SUB(NOW(), INTERVAL 3 DAY), "Chipotle", 11, 'PERSONAL_EXPENSE', NULL, 3, 1763, NULL, NULL, 'USD', 1, NOW(), NOW(), 1763);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (83, DATE_SUB(NOW(), INTERVAL 1 DAY), "Whole Foods", 10, 'PERSONAL_EXPENSE', NULL, 3, 11969, NULL, NULL, 'USD', 1, NOW(), NOW(), 11969);
INSERT IGNORE INTO Transaction (id, timestamp, description, categoryId, transactionType, tripId, outgoingAccountId, outgoingAmountCents, incomingAccountId, incomingAmountCents, currencyCode, userId, createdAt, updatedAt, amountCents)
    VALUES (84, DATE_SUB(NOW(), INTERVAL 0 DAY), "Local Cafe", 11, 'PERSONAL_EXPENSE', NULL, 3, 1965, NULL, NULL, 'USD', 1, NOW(), NOW(), 1965);