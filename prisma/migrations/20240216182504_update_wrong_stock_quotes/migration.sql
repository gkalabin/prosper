-- For some reason, yahoo finance API behaviour changed again, update the stock quotes to the correct value.
UPDATE StockQuote
SET value = value / 100
WHERE stockId IN (
    SELECT id
    FROM Stock
    WHERE ticker = "0P00018XAR.L"
  )
  AND value > 1000000;