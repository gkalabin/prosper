// Generated from lib/search/TransactionSearchQuery.g4 by ANTLR 4.13.1
// noinspection ES6UnusedImports,JSUnusedGlobalSymbols,JSUnusedLocalSymbols
import {
	ATN,
	ATNDeserializer,
	CharStream,
	DecisionState, DFA,
	Lexer,
	LexerATNSimulator,
	RuleContext,
	PredictionContextCache,
	Token
} from "antlr4";
export default class TransactionSearchQueryLexer extends Lexer {
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

	public static readonly channelNames: string[] = [ "DEFAULT_TOKEN_CHANNEL", "HIDDEN" ];
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
	public static readonly modeNames: string[] = [ "DEFAULT_MODE", ];

	public static readonly ruleNames: string[] = [
		"AND", "OR", "NOT", "PLUS", "LPAREN", "RPAREN", "OP_COLON", "OP_EQUAL",
		"OP_LESSTHAN", "OP_LESSTHANEQ", "OP_MORETHAN", "OP_MORETHANEQ", "QUOTED",
		"TERM", "DEFAULT_SKIP", "UNKNOWN", "WHITESPACE", "QUOTED_CHAR", "ESCAPED_CHAR",
		"TERM_START_CHAR", "TERM_CHAR",
	];


	constructor(input: CharStream) {
		super(input);
		this._interp = new LexerATNSimulator(this, TransactionSearchQueryLexer._ATN, TransactionSearchQueryLexer.DecisionsToDFA, new PredictionContextCache());
	}

	public get grammarFileName(): string { return "TransactionSearchQuery.g4"; }

	public get literalNames(): (string | null)[] { return TransactionSearchQueryLexer.literalNames; }
	public get symbolicNames(): (string | null)[] { return TransactionSearchQueryLexer.symbolicNames; }
	public get ruleNames(): string[] { return TransactionSearchQueryLexer.ruleNames; }

	public get serializedATN(): number[] { return TransactionSearchQueryLexer._serializedATN; }

	public get channelNames(): string[] { return TransactionSearchQueryLexer.channelNames; }

	public get modeNames(): string[] { return TransactionSearchQueryLexer.modeNames; }

	public static readonly _serializedATN: number[] = [4,0,16,122,6,-1,2,0,
	7,0,2,1,7,1,2,2,7,2,2,3,7,3,2,4,7,4,2,5,7,5,2,6,7,6,2,7,7,7,2,8,7,8,2,9,
	7,9,2,10,7,10,2,11,7,11,2,12,7,12,2,13,7,13,2,14,7,14,2,15,7,15,2,16,7,
	16,2,17,7,17,2,18,7,18,2,19,7,19,2,20,7,20,1,0,1,0,1,0,1,0,1,0,3,0,49,8,
	0,1,1,1,1,1,1,1,1,3,1,55,8,1,1,2,1,2,1,2,1,2,3,2,61,8,2,1,3,1,3,1,4,1,4,
	1,5,1,5,1,6,1,6,1,7,1,7,1,8,1,8,1,9,1,9,1,9,1,10,1,10,1,11,1,11,1,11,1,
	12,1,12,5,12,85,8,12,10,12,12,12,88,9,12,1,12,1,12,1,13,1,13,5,13,94,8,
	13,10,13,12,13,97,9,13,1,14,1,14,1,14,1,14,1,15,1,15,1,16,1,16,1,17,1,17,
	3,17,109,8,17,1,18,1,18,1,18,1,19,1,19,3,19,116,8,19,1,20,1,20,1,20,3,20,
	121,8,20,0,0,21,1,1,3,2,5,3,7,4,9,5,11,6,13,7,15,8,17,9,19,10,21,11,23,
	12,25,13,27,14,29,15,31,16,33,0,35,0,37,0,39,0,41,0,1,0,5,2,0,33,33,45,
	45,4,0,9,10,13,13,32,32,12288,12288,2,0,34,34,92,92,14,0,9,10,13,13,32,
	34,40,41,43,43,45,45,47,47,58,58,60,62,64,64,91,94,123,123,125,126,12288,
	12288,2,0,43,43,45,45,125,0,1,1,0,0,0,0,3,1,0,0,0,0,5,1,0,0,0,0,7,1,0,0,
	0,0,9,1,0,0,0,0,11,1,0,0,0,0,13,1,0,0,0,0,15,1,0,0,0,0,17,1,0,0,0,0,19,
	1,0,0,0,0,21,1,0,0,0,0,23,1,0,0,0,0,25,1,0,0,0,0,27,1,0,0,0,0,29,1,0,0,
	0,0,31,1,0,0,0,1,48,1,0,0,0,3,54,1,0,0,0,5,60,1,0,0,0,7,62,1,0,0,0,9,64,
	1,0,0,0,11,66,1,0,0,0,13,68,1,0,0,0,15,70,1,0,0,0,17,72,1,0,0,0,19,74,1,
	0,0,0,21,77,1,0,0,0,23,79,1,0,0,0,25,82,1,0,0,0,27,91,1,0,0,0,29,98,1,0,
	0,0,31,102,1,0,0,0,33,104,1,0,0,0,35,108,1,0,0,0,37,110,1,0,0,0,39,115,
	1,0,0,0,41,120,1,0,0,0,43,44,5,65,0,0,44,45,5,78,0,0,45,49,5,68,0,0,46,
	47,5,38,0,0,47,49,5,38,0,0,48,43,1,0,0,0,48,46,1,0,0,0,49,2,1,0,0,0,50,
	51,5,79,0,0,51,55,5,82,0,0,52,53,5,124,0,0,53,55,5,124,0,0,54,50,1,0,0,
	0,54,52,1,0,0,0,55,4,1,0,0,0,56,57,5,78,0,0,57,58,5,79,0,0,58,61,5,84,0,
	0,59,61,7,0,0,0,60,56,1,0,0,0,60,59,1,0,0,0,61,6,1,0,0,0,62,63,5,43,0,0,
	63,8,1,0,0,0,64,65,5,40,0,0,65,10,1,0,0,0,66,67,5,41,0,0,67,12,1,0,0,0,
	68,69,5,58,0,0,69,14,1,0,0,0,70,71,5,61,0,0,71,16,1,0,0,0,72,73,5,60,0,
	0,73,18,1,0,0,0,74,75,5,60,0,0,75,76,5,61,0,0,76,20,1,0,0,0,77,78,5,62,
	0,0,78,22,1,0,0,0,79,80,5,62,0,0,80,81,5,61,0,0,81,24,1,0,0,0,82,86,5,34,
	0,0,83,85,3,35,17,0,84,83,1,0,0,0,85,88,1,0,0,0,86,84,1,0,0,0,86,87,1,0,
	0,0,87,89,1,0,0,0,88,86,1,0,0,0,89,90,5,34,0,0,90,26,1,0,0,0,91,95,3,39,
	19,0,92,94,3,41,20,0,93,92,1,0,0,0,94,97,1,0,0,0,95,93,1,0,0,0,95,96,1,
	0,0,0,96,28,1,0,0,0,97,95,1,0,0,0,98,99,3,33,16,0,99,100,1,0,0,0,100,101,
	6,14,0,0,101,30,1,0,0,0,102,103,9,0,0,0,103,32,1,0,0,0,104,105,7,1,0,0,
	105,34,1,0,0,0,106,109,8,2,0,0,107,109,3,37,18,0,108,106,1,0,0,0,108,107,
	1,0,0,0,109,36,1,0,0,0,110,111,5,92,0,0,111,112,9,0,0,0,112,38,1,0,0,0,
	113,116,8,3,0,0,114,116,3,37,18,0,115,113,1,0,0,0,115,114,1,0,0,0,116,40,
	1,0,0,0,117,121,3,39,19,0,118,121,3,37,18,0,119,121,7,4,0,0,120,117,1,0,
	0,0,120,118,1,0,0,0,120,119,1,0,0,0,121,42,1,0,0,0,9,0,48,54,60,86,95,108,
	115,120,1,6,0,0];

	private static __ATN: ATN;
	public static get _ATN(): ATN {
		if (!TransactionSearchQueryLexer.__ATN) {
			TransactionSearchQueryLexer.__ATN = new ATNDeserializer().deserialize(TransactionSearchQueryLexer._serializedATN);
		}

		return TransactionSearchQueryLexer.__ATN;
	}


	static DecisionsToDFA = TransactionSearchQueryLexer._ATN.decisionToState.map( (ds: DecisionState, index: number) => new DFA(ds, index) );
}
