ALTER TABLE Bank ADD COLUMN iid INT;
ALTER TABLE Bank ADD UNIQUE KEY `Bank_userId_iid_key` (`userId`,`iid`);
UPDATE Bank b
INNER JOIN (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY userId ORDER BY id) AS iid
    FROM Bank
) AS sub ON b.id = sub.id
SET b.iid = sub.iid;





ALTER TABLE BankAccount ADD COLUMN iid INT;
ALTER TABLE BankAccount ADD UNIQUE KEY `BankAccount_userId_iid_key` (`userId`,`iid`);
UPDATE BankAccount b
INNER JOIN (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY userId ORDER BY id) AS iid
    FROM BankAccount
) AS sub ON b.id = sub.id
SET b.iid = sub.iid;


ALTER TABLE Category ADD COLUMN iid INT;
ALTER TABLE Category ADD UNIQUE KEY `Category_userId_iid_key` (`userId`,`iid`);
UPDATE Category b
INNER JOIN (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY userId ORDER BY id) AS iid
    FROM Category
) AS sub ON b.id = sub.id
SET b.iid = sub.iid;
