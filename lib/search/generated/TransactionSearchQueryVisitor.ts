// Generated from lib/search/TransactionSearchQuery.g4 by ANTLR 4.13.1

import {ParseTreeVisitor} from 'antlr4';


import { RootQueryContext } from "./TransactionSearchQueryParser";
import { QueryContext } from "./TransactionSearchQueryParser";
import { DisjQueryContext } from "./TransactionSearchQueryParser";
import { ConjQueryContext } from "./TransactionSearchQueryParser";
import { ModClauseContext } from "./TransactionSearchQueryParser";
import { ModifierContext } from "./TransactionSearchQueryParser";
import { ClauseContext } from "./TransactionSearchQueryParser";
import { FieldMatchExprContext } from "./TransactionSearchQueryParser";
import { FieldCompareExprContext } from "./TransactionSearchQueryParser";
import { CompareOpContext } from "./TransactionSearchQueryParser";
import { TermContext } from "./TransactionSearchQueryParser";
import { GroupingExprContext } from "./TransactionSearchQueryParser";
import { FieldNameContext } from "./TransactionSearchQueryParser";
import { QuotedTermContext } from "./TransactionSearchQueryParser";


/**
 * This interface defines a complete generic visitor for a parse tree produced
 * by `TransactionSearchQueryParser`.
 *
 * @param <Result> The return type of the visit operation. Use `void` for
 * operations with no return type.
 */
export default class TransactionSearchQueryVisitor<Result> extends ParseTreeVisitor<Result> {
	/**
	 * Visit a parse tree produced by `TransactionSearchQueryParser.rootQuery`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitRootQuery?: (ctx: RootQueryContext) => Result;
	/**
	 * Visit a parse tree produced by `TransactionSearchQueryParser.query`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitQuery?: (ctx: QueryContext) => Result;
	/**
	 * Visit a parse tree produced by `TransactionSearchQueryParser.disjQuery`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitDisjQuery?: (ctx: DisjQueryContext) => Result;
	/**
	 * Visit a parse tree produced by `TransactionSearchQueryParser.conjQuery`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitConjQuery?: (ctx: ConjQueryContext) => Result;
	/**
	 * Visit a parse tree produced by `TransactionSearchQueryParser.modClause`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitModClause?: (ctx: ModClauseContext) => Result;
	/**
	 * Visit a parse tree produced by `TransactionSearchQueryParser.modifier`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitModifier?: (ctx: ModifierContext) => Result;
	/**
	 * Visit a parse tree produced by `TransactionSearchQueryParser.clause`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitClause?: (ctx: ClauseContext) => Result;
	/**
	 * Visit a parse tree produced by `TransactionSearchQueryParser.fieldMatchExpr`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitFieldMatchExpr?: (ctx: FieldMatchExprContext) => Result;
	/**
	 * Visit a parse tree produced by `TransactionSearchQueryParser.fieldCompareExpr`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitFieldCompareExpr?: (ctx: FieldCompareExprContext) => Result;
	/**
	 * Visit a parse tree produced by `TransactionSearchQueryParser.compareOp`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCompareOp?: (ctx: CompareOpContext) => Result;
	/**
	 * Visit a parse tree produced by `TransactionSearchQueryParser.term`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTerm?: (ctx: TermContext) => Result;
	/**
	 * Visit a parse tree produced by `TransactionSearchQueryParser.groupingExpr`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitGroupingExpr?: (ctx: GroupingExprContext) => Result;
	/**
	 * Visit a parse tree produced by `TransactionSearchQueryParser.fieldName`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitFieldName?: (ctx: FieldNameContext) => Result;
	/**
	 * Visit a parse tree produced by `TransactionSearchQueryParser.quotedTerm`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitQuotedTerm?: (ctx: QuotedTermContext) => Result;
}

