-- (cd /opt/prosper/ && npx prisma db push)
-- sudo mysql prosperdb -e '
INSERT INTO ExternalAccountMapping (internalAccountId, externalAccountId, userId, createdAt, updatedAt) SELECT bankAccountId, openBankingAccountId, userId, createdAt, updatedAt FROM OpenBankingAccount;