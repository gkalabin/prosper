-- The provider token tables inherited a VARCHAR(191) `id` primary key with no
-- default from the previous Prisma schema, where the id was generated in
-- application code. The Go writers insert tokens without an id, which MySQL
-- rejects. The id is never read and no foreign key references it, so make it a
-- database-managed auto-increment integer.
ALTER TABLE `TrueLayerToken`
    DROP PRIMARY KEY,
    DROP COLUMN `id`,
    ADD COLUMN `id` INTEGER NOT NULL AUTO_INCREMENT FIRST,
    ADD PRIMARY KEY (`id`);

ALTER TABLE `GoCardlessToken`
    DROP PRIMARY KEY,
    DROP COLUMN `id`,
    ADD COLUMN `id` INTEGER NOT NULL AUTO_INCREMENT FIRST,
    ADD PRIMARY KEY (`id`);

ALTER TABLE `StarlingToken`
    DROP PRIMARY KEY,
    DROP COLUMN `id`,
    ADD COLUMN `id` INTEGER NOT NULL AUTO_INCREMENT FIRST,
    ADD PRIMARY KEY (`id`);
