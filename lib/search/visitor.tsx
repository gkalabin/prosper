import {assertDefined} from 'lib/assert';
import {Bank, BankAccount} from 'lib/model/BankAccount';
import {Category} from 'lib/model/Category';
import {Tag} from 'lib/model/Tag';
import {Trip} from 'lib/model/Trip';
import {Transaction} from 'lib/model/transaction/Transaction';
import {
  ClauseContext,
  CompareOpContext,
  ConjQueryContext,
  DisjQueryContext,
  FieldCompareExprContext,
  FieldMatchExprContext,
  ModClauseContext,
  QueryContext,
  RootQueryContext,
  TermContext,
} from 'lib/search/generated/TransactionSearchQueryParser';
import QueryVisitor from 'lib/search/generated/TransactionSearchQueryVisitor';
import {
  CaseMatch,
  ComparisonOperator,
  compareField,
  matchAnyField,
  matchField,
} from 'lib/search/matchers';
import {intersect, union} from 'lib/util/set';
import {removeQuotes} from 'lib/util/util';

type TransactionIds = readonly number[];

export class TransactionSearchQueryVisitor extends QueryVisitor<TransactionIds> {
  private readonly allIds: TransactionIds;

  constructor(
    private transactions: Transaction[],
    private banks: Bank[],
    private bankAccounts: BankAccount[],
    private categories: Category[],
    private trips: Trip[],
    private tags: Tag[]
  ) {
    super();
    this.allIds = transactions.map(t => t.id);
  }

  visitRootQuery = (ctx: RootQueryContext): TransactionIds => {
    return this.visitQuery(ctx.query());
  };

  // Query ::= DisjQuery ( DisjQuery )*
  visitQuery = (ctx: QueryContext): TransactionIds => {
    let result = this.allIds;
    for (const child of ctx.disjQuery_list()) {
      const match = this.visitDisjQuery(child);
      result = intersect(result, match);
    }
    return result;
  };

  // DisjQuery ::= ConjQuery ( OR ConjQuery )*
  visitDisjQuery = (ctx: DisjQueryContext) => {
    let result: TransactionIds = [];
    for (const child of ctx.conjQuery_list()) {
      const match = this.visitConjQuery(child);
      result = union(result, match);
    }
    // Ordering is lost during union, so we need to re-sort according to the
    // original transaction list.
    const set = new Set(result);
    return this.allIds.filter(id => set.has(id));
  };

  // ConjQuery ::= ModClause ( AND ModClause )*
  visitConjQuery = (ctx: ConjQueryContext): TransactionIds => {
    let result = this.allIds;
    for (const child of ctx.modClause_list()) {
      const match = this.visitModClause(child);
      result = intersect(result, match);
    }
    return result;
  };

  // modClause: modifier? clause;
  visitModClause = (ctx: ModClauseContext): TransactionIds => {
    const clauseMatch = this.visitClause(ctx.clause());
    const modifier = ctx.modifier();
    if (modifier) {
      assertDefined(modifier.NOT());
      const set = new Set(clauseMatch);
      return this.allIds.filter(x => !set.has(x));
    }
    return clauseMatch;
  };

  // clause: fieldCompareExpr | fieldMatchExpr | term | groupingExpr;
  visitClause = (ctx: ClauseContext): TransactionIds => {
    if (ctx.term()) {
      return this.visitTerm(ctx.term());
    }
    if (ctx.fieldMatchExpr()) {
      return this.visitFieldMatchExpr(ctx.fieldMatchExpr());
    }
    if (ctx.fieldCompareExpr()) {
      return this.visitFieldCompareExpr(ctx.fieldCompareExpr());
    }
    if (ctx.groupingExpr()) {
      return this.visitQuery(ctx.groupingExpr().query());
    }
    throw new Error(`Unknown clause: ${ctx.getText()}`);
  };

  // term: quotedTerm | TERM;
  visitTerm = (ctx: TermContext): TransactionIds => {
    const {term, c} = this.getTerm(ctx);
    return this.transactions
      .filter(t =>
        matchAnyField(
          t,
          term,
          c,
          this.banks,
          this.bankAccounts,
          this.categories,
          this.trips,
          this.tags
        )
      )
      .map(t => t.id);
  };

  // fieldMatchExpr: fieldName ( OP_COLON | OP_EQUAL) term
  visitFieldMatchExpr = (ctx: FieldMatchExprContext): TransactionIds => {
    const fieldName = ctx.fieldName().getText();
    const {term, c} = this.getTerm(ctx.term());
    return this.transactions
      .filter(t =>
        matchField(
          t,
          fieldName,
          term,
          c,
          this.banks,
          this.bankAccounts,
          this.categories,
          this.trips,
          this.tags
        )
      )
      .map(t => t.id);
  };

  // FieldCompareExpr ::= FieldName ('<' | '>' | '<=' | '>=') TERM
  visitFieldCompareExpr = (ctx: FieldCompareExprContext): TransactionIds => {
    const fieldName = ctx.fieldName().getText();
    const term = ctx.TERM().getText();
    const opCtx = ctx.compareOp();
    const op = this.compareOperationFromContext(opCtx);
    return this.transactions
      .filter(t => compareField(t, fieldName, op, term))
      .map(t => t.id);
  };

  private getTerm(ctx: TermContext): {term: string; c: CaseMatch} {
    if (ctx.TERM()) {
      const term = ctx.TERM().getText();
      return {term, c: CaseMatch.CaseInsensitive};
    }
    if (ctx.quotedTerm()) {
      const quotedTerm = ctx.quotedTerm().QUOTED().getText();
      const term = removeQuotes(quotedTerm);
      return {term, c: CaseMatch.Exact};
    }
    throw new Error(`Unknown term: ${ctx.getText()}`);
  }

  private compareOperationFromContext(
    opCtx: CompareOpContext
  ): ComparisonOperator {
    if (opCtx.OP_LESSTHAN()) {
      return ComparisonOperator.LessThan;
    }
    if (opCtx.OP_LESSTHANEQ()) {
      return ComparisonOperator.LessThanOrEqual;
    }
    if (opCtx.OP_MORETHAN()) {
      return ComparisonOperator.GreaterThan;
    }
    if (opCtx.OP_MORETHANEQ()) {
      return ComparisonOperator.GreaterThanOrEqual;
    }
    throw new Error(`Unknown comparison operator: ${opCtx.getText()}`);
  }
}
