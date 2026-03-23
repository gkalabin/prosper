// Shared data shapes for e2e fixtures. Each entity mirrors the
// corresponding row of the SQL schema; nullable columns appear as
// `field?: T | null` so factory overrides can opt in to either form.

export type User = {id: number; login: string; password: string};
export type UserWithRawPassword = User & {rawPassword: string};
export type Bank = {id: number; userId: number; name: string};

export type BankAccount = {
  id: number;
  userId: number;
  bankId: number;
  name: string;
  currencyCode: string | null;
  stockId: number | null;
  archived?: boolean;
  joint?: boolean;
  displayOrder?: number;
};

export type Category = {
  id: number;
  userId: number;
  name: string;
  parentCategoryId?: number | null;
  displayOrder?: number;
};

export type Tag = {id: number; userId: number; name: string};

export type Stock = {
  id: number;
  name: string;
  ticker: string;
  exchange: string;
  currencyCode: string;
};

// TestDataBundle is what createUserWithTestData returns: the smallest
// set of entities most tests want to start from.
export type TestDataBundle = {
  user: UserWithRawPassword;
  bank: Bank;
  account: BankAccount;
  category: Category;
};

// TransactionContext is the per-row context every transaction-shaped
// factory method needs. Pulled out so the long parameter lists on
// expense/income/etc. share a single base.
export type TransactionContext = {
  user: {id: number};
  account: {id: number};
  category: {id: number};
};
