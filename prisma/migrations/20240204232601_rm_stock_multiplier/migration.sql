-- For some reason, yahoo finance API behaviour changed and it returns now FTSE Global All Cap values in pounds instead of pence before.
UPDATE StockQuote
SET value = value / 100
WHERE stockId IN (
    SELECT id
    FROM Stock
    WHERE ticker = "0P00018XAR.L"
  )
  AND value > 1000000;
ALTER TABLE `Stock` DROP COLUMN `multiplier`;