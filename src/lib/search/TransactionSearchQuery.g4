// To generate the lexer and parser, run the following command:
// antlr4 -Dlanguage=TypeScript -no-listener -visitor -Werror -Xexact-output-dir -o src/lib/search/generated src/lib/search/TransactionSearchQuery.g4
grammar TransactionSearchQuery;

rootQuery: query EOF;

// Query ::= DisjQuery ( DisjQuery )*
query: disjQuery+;

// DisjQuery ::= ConjQuery ( OR ConjQuery )*
disjQuery: conjQuery (OR conjQuery)*;

// ConjQuery ::= ModClause ( AND ModClause )*
conjQuery: modClause (AND modClause)*;

modClause: modifier? clause;

modifier: NOT;

clause: fieldCompareExpr | fieldMatchExpr | term | groupingExpr;

fieldMatchExpr: fieldName ( OP_COLON | OP_EQUAL) term;

// FieldCompareExpr ::= FieldName ('<' | '>' | '<=' | '>=') TERM
fieldCompareExpr: fieldName compareOp TERM;

compareOp: OP_LESSTHAN | OP_MORETHAN | OP_LESSTHANEQ | OP_MORETHANEQ;

term: quotedTerm | TERM;

groupingExpr: LPAREN query RPAREN;

fieldName: TERM;

quotedTerm: QUOTED;

AND: 'AND' | '&&';

OR: 'OR' | '||';

NOT: 'NOT' | '!' | '-';

PLUS: '+';

LPAREN: '(';

RPAREN: ')';

OP_COLON: ':';

OP_EQUAL: '=';

OP_LESSTHAN: '<';

OP_LESSTHANEQ: '<=';

OP_MORETHAN: '>';

OP_MORETHANEQ: '>=';

QUOTED: '"' QUOTED_CHAR* '"';

TERM: TERM_START_CHAR TERM_CHAR*;

DEFAULT_SKIP: WHITESPACE -> skip;

UNKNOWN: .;

fragment WHITESPACE: [ \t\n\r\u3000];

fragment QUOTED_CHAR: ~["\\] | ESCAPED_CHAR;

fragment ESCAPED_CHAR: '\\' .;

fragment TERM_START_CHAR:
	~[ \t\n\r\u3000+\-!():^@<>=[\]"{}~\\/]
	| ESCAPED_CHAR;

fragment TERM_CHAR: ( TERM_START_CHAR | ESCAPED_CHAR | [\-+]);
