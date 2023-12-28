-- UPDATE StockQuote AS q SET currencyCode=(SELECT name from Currency AS c where c.id=q.currencyId);
-- UPDATE ExchangeRate AS e SET currencyCodeFrom=(SELECT name from Currency AS c where c.id=e.currencyFromId), currencyCodeTo=(SELECT name from Currency AS c where c.id=e.currencyToId);
-- UPDATE DisplaySettings AS q SET displayCurrencyCode=(SELECT name from Currency AS c where c.id=q.displayCurrencyId);
-- UPDATE BankAccount AS q SET currencyCode=(SELECT name from Currency AS c where c.id=q.currencyId);
-- UPDATE ThirdPartyExpense AS q SET currencyCode=(SELECT name from Currency AS c where c.id=q.currencyId);

-- insert into Stock (name, ticker, exchange, currencyCode, updatedAt) VALUES ("Alphabet Inc.", "GOOG", "NMS", "USD", CURRENT_TIMESTAMP);
-- update BankAccount SET currencyCode=null, stockId=1 where id=100;
-- update StockQuote set stockId=1;

-- INSERT INTO Currency (id, name, updatedAt) VALUES (7354, "UNUSED_CURRENCY", CURRENT_TIMESTAMP);

update StockQuote set stockId=1 where stockId is NULL;