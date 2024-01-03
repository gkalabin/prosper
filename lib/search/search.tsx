import {CharStream, CommonTokenStream, ErrorListener, Recognizer} from 'antlr4';
import {Bank, BankAccount} from 'lib/model/BankAccount';
import {Category} from 'lib/model/Category';
import {Tag} from 'lib/model/Tag';
import {Trip} from 'lib/model/Trip';
import {Transaction} from 'lib/model/transaction/Transaction';
import QueryLexer from 'lib/search/generated/TransactionSearchQueryLexer';
import QueryParser from 'lib/search/generated/TransactionSearchQueryParser';
import {CaseMatch, matchAnyField} from 'lib/search/matchers';
import {TransactionSearchQueryVisitor} from 'lib/search/visitor';

export class QuerySyntaxError extends Error {
  constructor(private errors: string[]) {
    super('Query syntax error');
    Object.setPrototypeOf(this, QuerySyntaxError.prototype);
  }

  public getErrors(): string[] {
    return this.errors;
  }
}

class ErrorsCollector extends ErrorListener<never> {
  private errors = new Array<string>();

  public getErrors(): string[] {
    return this.errors;
  }

  syntaxError(
    _recognizer: Recognizer<never>,
    _offendingSymbol: never,
    _line: number,
    _column: number,
    msg: string
  ): void {
    this.errors.push(msg);
  }
}

export function search(
  query: string,
  transactions: Transaction[],
  banks: Bank[],
  bankAccounts: BankAccount[],
  categories: Category[],
  trips: Trip[],
  tags: Tag[]
): Transaction[] {
  if (!query || !query.trim()) {
    return transactions;
  }
  const chars = new CharStream(query);
  const lexer = new QueryLexer(chars);
  const errorListener = new ErrorsCollector();
  lexer.removeErrorListeners();
  lexer.addErrorListener(errorListener);
  const tokens = new CommonTokenStream(lexer);
  const parser = new QueryParser(tokens);
  parser.removeErrorListeners();
  parser.addErrorListener(errorListener);
  const tree = parser.query();
  // Do not parse the tree if there are any errors as
  // making sense of partially valid tree requires lots more work.
  if (errorListener.getErrors().length > 0) {
    throw new QuerySyntaxError(errorListener.getErrors());
  }
  // At this stage we can be certain that the tree is valid.
  const matchedIds = tree.accept(
    new TransactionSearchQueryVisitor(
      transactions,
      banks,
      bankAccounts,
      categories,
      trips,
      tags
    )
  );
  const matchSet = new Set(matchedIds);
  return transactions.filter(t => matchSet.has(t.id));
}

export function fallbackSearch(
  query: string,
  transactions: Transaction[],
  banks: Bank[],
  bankAccounts: BankAccount[],
  categories: Category[],
  trips: Trip[],
  tags: Tag[]
): Transaction[] {
  if (!query || !query.trim()) {
    return transactions;
  }
  return transactions.filter(t =>
    matchAnyField(
      t,
      query,
      CaseMatch.CaseInsensitive,
      banks,
      bankAccounts,
      categories,
      trips,
      tags
    )
  );
}
