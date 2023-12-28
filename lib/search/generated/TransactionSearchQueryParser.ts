// Generated from lib/search/TransactionSearchQuery.g4 by ANTLR 4.13.1
// noinspection ES6UnusedImports,JSUnusedGlobalSymbols,JSUnusedLocalSymbols

import {
	ATN,
	ATNDeserializer, DecisionState, DFA, FailedPredicateException,
	RecognitionException, NoViableAltException, BailErrorStrategy,
	Parser, ParserATNSimulator,
	RuleContext, ParserRuleContext, PredictionMode, PredictionContextCache,
	TerminalNode, RuleNode,
	Token, TokenStream,
	Interval, IntervalSet
} from 'antlr4';
import TransactionSearchQueryVisitor from "./TransactionSearchQueryVisitor.js";

// for running tests with parameters, TODO: discuss strategy for typed parameters in CI
// eslint-disable-next-line no-unused-vars
type int = number;

export default class TransactionSearchQueryParser extends Parser {
	public static readonly AND = 1;
	public static readonly OR = 2;
	public static readonly NOT = 3;
	public static readonly PLUS = 4;
	public static readonly LPAREN = 5;
	public static readonly RPAREN = 6;
	public static readonly OP_COLON = 7;
	public static readonly OP_EQUAL = 8;
	public static readonly OP_LESSTHAN = 9;
	public static readonly OP_LESSTHANEQ = 10;
	public static readonly OP_MORETHAN = 11;
	public static readonly OP_MORETHANEQ = 12;
	public static readonly QUOTED = 13;
	public static readonly TERM = 14;
	public static readonly DEFAULT_SKIP = 15;
	public static readonly UNKNOWN = 16;
	public static readonly EOF = Token.EOF;
	public static readonly RULE_rootQuery = 0;
	public static readonly RULE_query = 1;
	public static readonly RULE_disjQuery = 2;
	public static readonly RULE_conjQuery = 3;
	public static readonly RULE_modClause = 4;
	public static readonly RULE_modifier = 5;
	public static readonly RULE_clause = 6;
	public static readonly RULE_fieldMatchExpr = 7;
	public static readonly RULE_fieldCompareExpr = 8;
	public static readonly RULE_compareOp = 9;
	public static readonly RULE_term = 10;
	public static readonly RULE_groupingExpr = 11;
	public static readonly RULE_fieldName = 12;
	public static readonly RULE_quotedTerm = 13;
	public static readonly literalNames: (string | null)[] = [ null, null, 
                                                            null, null, 
                                                            "'+'", "'('", 
                                                            "')'", "':'", 
                                                            "'='", "'<'", 
                                                            "'<='", "'>'", 
                                                            "'>='" ];
	public static readonly symbolicNames: (string | null)[] = [ null, "AND", 
                                                             "OR", "NOT", 
                                                             "PLUS", "LPAREN", 
                                                             "RPAREN", "OP_COLON", 
                                                             "OP_EQUAL", 
                                                             "OP_LESSTHAN", 
                                                             "OP_LESSTHANEQ", 
                                                             "OP_MORETHAN", 
                                                             "OP_MORETHANEQ", 
                                                             "QUOTED", "TERM", 
                                                             "DEFAULT_SKIP", 
                                                             "UNKNOWN" ];
	// tslint:disable:no-trailing-whitespace
	public static readonly ruleNames: string[] = [
		"rootQuery", "query", "disjQuery", "conjQuery", "modClause", "modifier", 
		"clause", "fieldMatchExpr", "fieldCompareExpr", "compareOp", "term", "groupingExpr", 
		"fieldName", "quotedTerm",
	];
	public get grammarFileName(): string { return "TransactionSearchQuery.g4"; }
	public get literalNames(): (string | null)[] { return TransactionSearchQueryParser.literalNames; }
	public get symbolicNames(): (string | null)[] { return TransactionSearchQueryParser.symbolicNames; }
	public get ruleNames(): string[] { return TransactionSearchQueryParser.ruleNames; }
	public get serializedATN(): number[] { return TransactionSearchQueryParser._serializedATN; }

	protected createFailedPredicateException(predicate?: string, message?: string): FailedPredicateException {
		return new FailedPredicateException(this, predicate, message);
	}

	constructor(input: TokenStream) {
		super(input);
		this._interp = new ParserATNSimulator(this, TransactionSearchQueryParser._ATN, TransactionSearchQueryParser.DecisionsToDFA, new PredictionContextCache());
	}
	// @RuleVersion(0)
	public rootQuery(): RootQueryContext {
		let localctx: RootQueryContext = new RootQueryContext(this, this._ctx, this.state);
		this.enterRule(localctx, 0, TransactionSearchQueryParser.RULE_rootQuery);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 28;
			this.query();
			this.state = 29;
			this.match(TransactionSearchQueryParser.EOF);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public query(): QueryContext {
		let localctx: QueryContext = new QueryContext(this, this._ctx, this.state);
		this.enterRule(localctx, 2, TransactionSearchQueryParser.RULE_query);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 32;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			do {
				{
				{
				this.state = 31;
				this.disjQuery();
				}
				}
				this.state = 34;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			} while ((((_la) & ~0x1F) === 0 && ((1 << _la) & 24584) !== 0));
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public disjQuery(): DisjQueryContext {
		let localctx: DisjQueryContext = new DisjQueryContext(this, this._ctx, this.state);
		this.enterRule(localctx, 4, TransactionSearchQueryParser.RULE_disjQuery);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 36;
			this.conjQuery();
			this.state = 41;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===2) {
				{
				{
				this.state = 37;
				this.match(TransactionSearchQueryParser.OR);
				this.state = 38;
				this.conjQuery();
				}
				}
				this.state = 43;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public conjQuery(): ConjQueryContext {
		let localctx: ConjQueryContext = new ConjQueryContext(this, this._ctx, this.state);
		this.enterRule(localctx, 6, TransactionSearchQueryParser.RULE_conjQuery);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 44;
			this.modClause();
			this.state = 49;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===1) {
				{
				{
				this.state = 45;
				this.match(TransactionSearchQueryParser.AND);
				this.state = 46;
				this.modClause();
				}
				}
				this.state = 51;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public modClause(): ModClauseContext {
		let localctx: ModClauseContext = new ModClauseContext(this, this._ctx, this.state);
		this.enterRule(localctx, 8, TransactionSearchQueryParser.RULE_modClause);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 53;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===3) {
				{
				this.state = 52;
				this.modifier();
				}
			}

			this.state = 55;
			this.clause();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public modifier(): ModifierContext {
		let localctx: ModifierContext = new ModifierContext(this, this._ctx, this.state);
		this.enterRule(localctx, 10, TransactionSearchQueryParser.RULE_modifier);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 57;
			this.match(TransactionSearchQueryParser.NOT);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public clause(): ClauseContext {
		let localctx: ClauseContext = new ClauseContext(this, this._ctx, this.state);
		this.enterRule(localctx, 12, TransactionSearchQueryParser.RULE_clause);
		try {
			this.state = 62;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 4, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 59;
				this.fieldCompareExpr();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 60;
				this.fieldMatchExpr();
				}
				break;
			case 3:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 61;
				this.term();
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public fieldMatchExpr(): FieldMatchExprContext {
		let localctx: FieldMatchExprContext = new FieldMatchExprContext(this, this._ctx, this.state);
		this.enterRule(localctx, 14, TransactionSearchQueryParser.RULE_fieldMatchExpr);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 64;
			this.fieldName();
			this.state = 65;
			_la = this._input.LA(1);
			if(!(_la===7 || _la===8)) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
			this.state = 66;
			this.term();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public fieldCompareExpr(): FieldCompareExprContext {
		let localctx: FieldCompareExprContext = new FieldCompareExprContext(this, this._ctx, this.state);
		this.enterRule(localctx, 16, TransactionSearchQueryParser.RULE_fieldCompareExpr);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 68;
			this.fieldName();
			this.state = 69;
			this.compareOp();
			this.state = 70;
			this.match(TransactionSearchQueryParser.TERM);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public compareOp(): CompareOpContext {
		let localctx: CompareOpContext = new CompareOpContext(this, this._ctx, this.state);
		this.enterRule(localctx, 18, TransactionSearchQueryParser.RULE_compareOp);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 72;
			_la = this._input.LA(1);
			if(!((((_la) & ~0x1F) === 0 && ((1 << _la) & 7680) !== 0))) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public term(): TermContext {
		let localctx: TermContext = new TermContext(this, this._ctx, this.state);
		this.enterRule(localctx, 20, TransactionSearchQueryParser.RULE_term);
		try {
			this.state = 76;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 13:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 74;
				this.quotedTerm();
				}
				break;
			case 14:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 75;
				this.match(TransactionSearchQueryParser.TERM);
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public groupingExpr(): GroupingExprContext {
		let localctx: GroupingExprContext = new GroupingExprContext(this, this._ctx, this.state);
		this.enterRule(localctx, 22, TransactionSearchQueryParser.RULE_groupingExpr);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 78;
			this.match(TransactionSearchQueryParser.LPAREN);
			this.state = 79;
			this.query();
			this.state = 80;
			this.match(TransactionSearchQueryParser.RPAREN);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public fieldName(): FieldNameContext {
		let localctx: FieldNameContext = new FieldNameContext(this, this._ctx, this.state);
		this.enterRule(localctx, 24, TransactionSearchQueryParser.RULE_fieldName);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 82;
			this.match(TransactionSearchQueryParser.TERM);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public quotedTerm(): QuotedTermContext {
		let localctx: QuotedTermContext = new QuotedTermContext(this, this._ctx, this.state);
		this.enterRule(localctx, 26, TransactionSearchQueryParser.RULE_quotedTerm);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 84;
			this.match(TransactionSearchQueryParser.QUOTED);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}

	public static readonly _serializedATN: number[] = [4,1,16,87,2,0,7,0,2,
	1,7,1,2,2,7,2,2,3,7,3,2,4,7,4,2,5,7,5,2,6,7,6,2,7,7,7,2,8,7,8,2,9,7,9,2,
	10,7,10,2,11,7,11,2,12,7,12,2,13,7,13,1,0,1,0,1,0,1,1,4,1,33,8,1,11,1,12,
	1,34,1,2,1,2,1,2,5,2,40,8,2,10,2,12,2,43,9,2,1,3,1,3,1,3,5,3,48,8,3,10,
	3,12,3,51,9,3,1,4,3,4,54,8,4,1,4,1,4,1,5,1,5,1,6,1,6,1,6,3,6,63,8,6,1,7,
	1,7,1,7,1,7,1,8,1,8,1,8,1,8,1,9,1,9,1,10,1,10,3,10,77,8,10,1,11,1,11,1,
	11,1,11,1,12,1,12,1,13,1,13,1,13,0,0,14,0,2,4,6,8,10,12,14,16,18,20,22,
	24,26,0,2,1,0,7,8,1,0,9,12,79,0,28,1,0,0,0,2,32,1,0,0,0,4,36,1,0,0,0,6,
	44,1,0,0,0,8,53,1,0,0,0,10,57,1,0,0,0,12,62,1,0,0,0,14,64,1,0,0,0,16,68,
	1,0,0,0,18,72,1,0,0,0,20,76,1,0,0,0,22,78,1,0,0,0,24,82,1,0,0,0,26,84,1,
	0,0,0,28,29,3,2,1,0,29,30,5,0,0,1,30,1,1,0,0,0,31,33,3,4,2,0,32,31,1,0,
	0,0,33,34,1,0,0,0,34,32,1,0,0,0,34,35,1,0,0,0,35,3,1,0,0,0,36,41,3,6,3,
	0,37,38,5,2,0,0,38,40,3,6,3,0,39,37,1,0,0,0,40,43,1,0,0,0,41,39,1,0,0,0,
	41,42,1,0,0,0,42,5,1,0,0,0,43,41,1,0,0,0,44,49,3,8,4,0,45,46,5,1,0,0,46,
	48,3,8,4,0,47,45,1,0,0,0,48,51,1,0,0,0,49,47,1,0,0,0,49,50,1,0,0,0,50,7,
	1,0,0,0,51,49,1,0,0,0,52,54,3,10,5,0,53,52,1,0,0,0,53,54,1,0,0,0,54,55,
	1,0,0,0,55,56,3,12,6,0,56,9,1,0,0,0,57,58,5,3,0,0,58,11,1,0,0,0,59,63,3,
	16,8,0,60,63,3,14,7,0,61,63,3,20,10,0,62,59,1,0,0,0,62,60,1,0,0,0,62,61,
	1,0,0,0,63,13,1,0,0,0,64,65,3,24,12,0,65,66,7,0,0,0,66,67,3,20,10,0,67,
	15,1,0,0,0,68,69,3,24,12,0,69,70,3,18,9,0,70,71,5,14,0,0,71,17,1,0,0,0,
	72,73,7,1,0,0,73,19,1,0,0,0,74,77,3,26,13,0,75,77,5,14,0,0,76,74,1,0,0,
	0,76,75,1,0,0,0,77,21,1,0,0,0,78,79,5,5,0,0,79,80,3,2,1,0,80,81,5,6,0,0,
	81,23,1,0,0,0,82,83,5,14,0,0,83,25,1,0,0,0,84,85,5,13,0,0,85,27,1,0,0,0,
	6,34,41,49,53,62,76];

	private static __ATN: ATN;
	public static get _ATN(): ATN {
		if (!TransactionSearchQueryParser.__ATN) {
			TransactionSearchQueryParser.__ATN = new ATNDeserializer().deserialize(TransactionSearchQueryParser._serializedATN);
		}

		return TransactionSearchQueryParser.__ATN;
	}


	static DecisionsToDFA = TransactionSearchQueryParser._ATN.decisionToState.map( (ds: DecisionState, index: number) => new DFA(ds, index) );

}

export class RootQueryContext extends ParserRuleContext {
	constructor(parser?: TransactionSearchQueryParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public query(): QueryContext {
		return this.getTypedRuleContext(QueryContext, 0) as QueryContext;
	}
	public EOF(): TerminalNode {
		return this.getToken(TransactionSearchQueryParser.EOF, 0);
	}
    public get ruleIndex(): number {
    	return TransactionSearchQueryParser.RULE_rootQuery;
	}
	// @Override
	public accept<Result>(visitor: TransactionSearchQueryVisitor<Result>): Result {
		if (visitor.visitRootQuery) {
			return visitor.visitRootQuery(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class QueryContext extends ParserRuleContext {
	constructor(parser?: TransactionSearchQueryParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public disjQuery_list(): DisjQueryContext[] {
		return this.getTypedRuleContexts(DisjQueryContext) as DisjQueryContext[];
	}
	public disjQuery(i: number): DisjQueryContext {
		return this.getTypedRuleContext(DisjQueryContext, i) as DisjQueryContext;
	}
    public get ruleIndex(): number {
    	return TransactionSearchQueryParser.RULE_query;
	}
	// @Override
	public accept<Result>(visitor: TransactionSearchQueryVisitor<Result>): Result {
		if (visitor.visitQuery) {
			return visitor.visitQuery(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class DisjQueryContext extends ParserRuleContext {
	constructor(parser?: TransactionSearchQueryParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public conjQuery_list(): ConjQueryContext[] {
		return this.getTypedRuleContexts(ConjQueryContext) as ConjQueryContext[];
	}
	public conjQuery(i: number): ConjQueryContext {
		return this.getTypedRuleContext(ConjQueryContext, i) as ConjQueryContext;
	}
	public OR_list(): TerminalNode[] {
	    	return this.getTokens(TransactionSearchQueryParser.OR);
	}
	public OR(i: number): TerminalNode {
		return this.getToken(TransactionSearchQueryParser.OR, i);
	}
    public get ruleIndex(): number {
    	return TransactionSearchQueryParser.RULE_disjQuery;
	}
	// @Override
	public accept<Result>(visitor: TransactionSearchQueryVisitor<Result>): Result {
		if (visitor.visitDisjQuery) {
			return visitor.visitDisjQuery(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ConjQueryContext extends ParserRuleContext {
	constructor(parser?: TransactionSearchQueryParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public modClause_list(): ModClauseContext[] {
		return this.getTypedRuleContexts(ModClauseContext) as ModClauseContext[];
	}
	public modClause(i: number): ModClauseContext {
		return this.getTypedRuleContext(ModClauseContext, i) as ModClauseContext;
	}
	public AND_list(): TerminalNode[] {
	    	return this.getTokens(TransactionSearchQueryParser.AND);
	}
	public AND(i: number): TerminalNode {
		return this.getToken(TransactionSearchQueryParser.AND, i);
	}
    public get ruleIndex(): number {
    	return TransactionSearchQueryParser.RULE_conjQuery;
	}
	// @Override
	public accept<Result>(visitor: TransactionSearchQueryVisitor<Result>): Result {
		if (visitor.visitConjQuery) {
			return visitor.visitConjQuery(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ModClauseContext extends ParserRuleContext {
	constructor(parser?: TransactionSearchQueryParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public clause(): ClauseContext {
		return this.getTypedRuleContext(ClauseContext, 0) as ClauseContext;
	}
	public modifier(): ModifierContext {
		return this.getTypedRuleContext(ModifierContext, 0) as ModifierContext;
	}
    public get ruleIndex(): number {
    	return TransactionSearchQueryParser.RULE_modClause;
	}
	// @Override
	public accept<Result>(visitor: TransactionSearchQueryVisitor<Result>): Result {
		if (visitor.visitModClause) {
			return visitor.visitModClause(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ModifierContext extends ParserRuleContext {
	constructor(parser?: TransactionSearchQueryParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public NOT(): TerminalNode {
		return this.getToken(TransactionSearchQueryParser.NOT, 0);
	}
    public get ruleIndex(): number {
    	return TransactionSearchQueryParser.RULE_modifier;
	}
	// @Override
	public accept<Result>(visitor: TransactionSearchQueryVisitor<Result>): Result {
		if (visitor.visitModifier) {
			return visitor.visitModifier(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ClauseContext extends ParserRuleContext {
	constructor(parser?: TransactionSearchQueryParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public fieldCompareExpr(): FieldCompareExprContext {
		return this.getTypedRuleContext(FieldCompareExprContext, 0) as FieldCompareExprContext;
	}
	public fieldMatchExpr(): FieldMatchExprContext {
		return this.getTypedRuleContext(FieldMatchExprContext, 0) as FieldMatchExprContext;
	}
	public term(): TermContext {
		return this.getTypedRuleContext(TermContext, 0) as TermContext;
	}
    public get ruleIndex(): number {
    	return TransactionSearchQueryParser.RULE_clause;
	}
	// @Override
	public accept<Result>(visitor: TransactionSearchQueryVisitor<Result>): Result {
		if (visitor.visitClause) {
			return visitor.visitClause(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class FieldMatchExprContext extends ParserRuleContext {
	constructor(parser?: TransactionSearchQueryParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public fieldName(): FieldNameContext {
		return this.getTypedRuleContext(FieldNameContext, 0) as FieldNameContext;
	}
	public term(): TermContext {
		return this.getTypedRuleContext(TermContext, 0) as TermContext;
	}
	public OP_COLON(): TerminalNode {
		return this.getToken(TransactionSearchQueryParser.OP_COLON, 0);
	}
	public OP_EQUAL(): TerminalNode {
		return this.getToken(TransactionSearchQueryParser.OP_EQUAL, 0);
	}
    public get ruleIndex(): number {
    	return TransactionSearchQueryParser.RULE_fieldMatchExpr;
	}
	// @Override
	public accept<Result>(visitor: TransactionSearchQueryVisitor<Result>): Result {
		if (visitor.visitFieldMatchExpr) {
			return visitor.visitFieldMatchExpr(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class FieldCompareExprContext extends ParserRuleContext {
	constructor(parser?: TransactionSearchQueryParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public fieldName(): FieldNameContext {
		return this.getTypedRuleContext(FieldNameContext, 0) as FieldNameContext;
	}
	public compareOp(): CompareOpContext {
		return this.getTypedRuleContext(CompareOpContext, 0) as CompareOpContext;
	}
	public TERM(): TerminalNode {
		return this.getToken(TransactionSearchQueryParser.TERM, 0);
	}
    public get ruleIndex(): number {
    	return TransactionSearchQueryParser.RULE_fieldCompareExpr;
	}
	// @Override
	public accept<Result>(visitor: TransactionSearchQueryVisitor<Result>): Result {
		if (visitor.visitFieldCompareExpr) {
			return visitor.visitFieldCompareExpr(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class CompareOpContext extends ParserRuleContext {
	constructor(parser?: TransactionSearchQueryParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public OP_LESSTHAN(): TerminalNode {
		return this.getToken(TransactionSearchQueryParser.OP_LESSTHAN, 0);
	}
	public OP_MORETHAN(): TerminalNode {
		return this.getToken(TransactionSearchQueryParser.OP_MORETHAN, 0);
	}
	public OP_LESSTHANEQ(): TerminalNode {
		return this.getToken(TransactionSearchQueryParser.OP_LESSTHANEQ, 0);
	}
	public OP_MORETHANEQ(): TerminalNode {
		return this.getToken(TransactionSearchQueryParser.OP_MORETHANEQ, 0);
	}
    public get ruleIndex(): number {
    	return TransactionSearchQueryParser.RULE_compareOp;
	}
	// @Override
	public accept<Result>(visitor: TransactionSearchQueryVisitor<Result>): Result {
		if (visitor.visitCompareOp) {
			return visitor.visitCompareOp(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class TermContext extends ParserRuleContext {
	constructor(parser?: TransactionSearchQueryParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public quotedTerm(): QuotedTermContext {
		return this.getTypedRuleContext(QuotedTermContext, 0) as QuotedTermContext;
	}
	public TERM(): TerminalNode {
		return this.getToken(TransactionSearchQueryParser.TERM, 0);
	}
    public get ruleIndex(): number {
    	return TransactionSearchQueryParser.RULE_term;
	}
	// @Override
	public accept<Result>(visitor: TransactionSearchQueryVisitor<Result>): Result {
		if (visitor.visitTerm) {
			return visitor.visitTerm(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class GroupingExprContext extends ParserRuleContext {
	constructor(parser?: TransactionSearchQueryParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public LPAREN(): TerminalNode {
		return this.getToken(TransactionSearchQueryParser.LPAREN, 0);
	}
	public query(): QueryContext {
		return this.getTypedRuleContext(QueryContext, 0) as QueryContext;
	}
	public RPAREN(): TerminalNode {
		return this.getToken(TransactionSearchQueryParser.RPAREN, 0);
	}
    public get ruleIndex(): number {
    	return TransactionSearchQueryParser.RULE_groupingExpr;
	}
	// @Override
	public accept<Result>(visitor: TransactionSearchQueryVisitor<Result>): Result {
		if (visitor.visitGroupingExpr) {
			return visitor.visitGroupingExpr(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class FieldNameContext extends ParserRuleContext {
	constructor(parser?: TransactionSearchQueryParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public TERM(): TerminalNode {
		return this.getToken(TransactionSearchQueryParser.TERM, 0);
	}
    public get ruleIndex(): number {
    	return TransactionSearchQueryParser.RULE_fieldName;
	}
	// @Override
	public accept<Result>(visitor: TransactionSearchQueryVisitor<Result>): Result {
		if (visitor.visitFieldName) {
			return visitor.visitFieldName(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class QuotedTermContext extends ParserRuleContext {
	constructor(parser?: TransactionSearchQueryParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public QUOTED(): TerminalNode {
		return this.getToken(TransactionSearchQueryParser.QUOTED, 0);
	}
    public get ruleIndex(): number {
    	return TransactionSearchQueryParser.RULE_quotedTerm;
	}
	// @Override
	public accept<Result>(visitor: TransactionSearchQueryVisitor<Result>): Result {
		if (visitor.visitQuotedTerm) {
			return visitor.visitQuotedTerm(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
