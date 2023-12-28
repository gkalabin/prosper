import { Bank, BankAccount } from "./model/BankAccount";
import { Category, categoryModelFromDB } from "./model/Category";
import { Currency, currencyModelFromDB } from "./model/Currency";
import { Transaction } from "./model/Transaction";
import { AllDatabaseData } from "./ServerSideDB";

export type AllDataModel = {
  transactions: Transaction[];
  categories: Category[];
  banks: Bank[];
  bankAccounts: BankAccount[];
  currencies: Currency[];
};

export const modelFromDatabaseData = (
  dbData: AllDatabaseData
): AllDataModel => {
  const categories = categoryModelFromDB(dbData.dbCategories);
  const categoryById: {
    [id: number]: Category;
  } = Object.fromEntries(categories.map((c) => [c.id, c]));

  const currencies = currencyModelFromDB(dbData.dbCurrencies);
  const currencyById: {
    [id: number]: Currency;
  } = Object.fromEntries(currencies.map((x) => [x.id, x]));

  const banks = dbData.dbBanks.map((b) =>
    Object.assign({}, b, {
      accounts: [],
      dbValue: b,
    })
  );
  const bankById: {
    [id: number]: Bank;
  } = Object.fromEntries(banks.map((x) => [x.id, x]));
  const bankAccounts = dbData.dbBankAccounts.map((x) =>
    Object.assign({}, x, {
      bank: bankById[x.bankId],
      currency: currencyById[x.currencyId],
      dbValue: x,
      transactions: [],
    })
  );
  bankAccounts.forEach((x) => x.bank.accounts.push(x));
  const bankAccountById: {
    [id: number]: BankAccount;
  } = Object.fromEntries(bankAccounts.map((x) => [x.id, x]));

  const transactionById: {
    [id: number]: Transaction;
  } = {};
  for (const x of dbData.dbTransactions) {
    const {
      id,
      timestamp,
      description,
      amountCents,
      categoryId,
      personalExpense,
    } = x;
    const transactionModel = {
      id: id,
      timestamp: new Date(timestamp),
      description: description,
      amountCents: amountCents,
      category: categoryById[categoryId],
      personalExpense: null,
      thirdPartyExpense: null,
      income: null,
      transfer: null,
    };
    if (personalExpense) {
      const bankAccount = bankAccountById[personalExpense.accountId];
      transactionModel.personalExpense = Object.assign({}, personalExpense, {
        account: bankAccount,
        dbValue: personalExpense,
      });
      bankAccount.transactions.push(transactionModel);
    }
    transactionById[id] = transactionModel;
  }
  dbData.dbThirdPartyExpense.forEach((x) => {
    const m = Object.assign({}, x, {
      currency: currencyById[x.currencyId],
      dbValue: x,
    });
    const transaction = transactionById[x.transactionId];
    transaction.thirdPartyExpense = m;
    return m;
  });
  dbData.dbTransfer.forEach((x) => {
    const accountFrom = bankAccountById[x.accountFromId];
    const accountTo = bankAccountById[x.accountToId];
    const m = Object.assign({}, x, {
      accountFrom: accountFrom,
      accountTo: accountTo,
      dbValue: x,
    });
    const transaction = transactionById[x.transactionId];
    transaction.transfer = m;
    accountFrom.transactions.push(transaction);
    accountTo.transactions.push(transaction);
    return m;
  });
  dbData.dbIncome.forEach((x) => {
    const bankAccount = bankAccountById[x.accountId];
    const m = Object.assign({}, x, {
      account: bankAccount,
      dbValue: x,
    });
    const transaction = transactionById[x.transactionId];
    transaction.income = m;
    bankAccount.transactions.push(transaction);
    return m;
  });

  const transactions = validateTransactionModel(Object.values(transactionById));
  transactions.sort(compareTransactions);
  bankAccounts.forEach(ba => ba.transactions.sort(compareTransactions))

  return {
    banks,
    bankAccounts,
    currencies,
    categories,
    transactions,
  };
};

function compareTransactions(a: Transaction, b: Transaction) {
  return b.timestamp.getTime() - a.timestamp.getTime();
}

function validateTransactionModel(transactions: Transaction[]): Transaction[] {
  return transactions.filter((x) => {
    const extensions = [
      x.personalExpense,
      x.thirdPartyExpense,
      x.income,
      x.transfer,
    ];
    const definedExtensions = extensions.filter((x) => !!x);
    if (definedExtensions.length != 1) {
      console.error(
        x,
        `Want only one extension, but got ${definedExtensions.length}, ignoring`,
        definedExtensions
      );
      return false;
    }
    return true;
  });
}
