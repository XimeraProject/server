/* I'm just using jison to produce the lexer for latex */

/* lexical grammar */
%lex
%%

\s+                   /* skip whitespace */
[0-9]+("."[0-9]+)?  return 'NUMBER'
"*"                     return '*'
"/"                     return '/'
"-"                     return '-'
"+"                     return '+'
"^"                     return '^'
"("                     return '('
"\\left("               return '('
"\\right)"              return ')'
"\\left["               return '['
"\\right]"              return ']'
"["                     return '['
"]"                     return ']'
"\\left|"               return 'LEFT_ABS'
"\\right|"              return 'RIGHT_ABS'
")"                     return ')'
"{"                     return '{'
"}"                     return '}'
"\\cdot"                return '*'
"\\pi"                  return 'PI'
"\\frac"                return 'FRAC'
"\pi"                   return 'PI'
"\\sin"                 return 'SIN'
"\\cos"                 return 'COS'
"\\tan"                 return 'TAN'
"\\csc"                 return 'CSC'
"\\sec"                 return 'SEC'
"\\cot"                 return 'COT'
"\\sin"                 return 'SIN'
"\\cos"                 return 'COS'
"\\tan"                 return 'TAN'
"\\csc"                 return 'CSC'
"\\sec"                 return 'SEC'
"\\cot"                 return 'COT'

"\\pi"                  return 'PI'

"\\arcsin"              return 'ARCSIN'
"\\arccos"              return 'ARCCOS'
"\\arctan"              return 'ARCTAN'
"\\asin"                return 'ARCSIN'
"\\acos"                return 'ARCCOS'
"\\atan"                return 'ARCTAN'
"\\log"                 return 'LOG'
"\\ln"                  return 'LOG'
"\\exp"                 return 'EXP'
"\\sqrt"                return 'SQRT'
[A-Za-z]                return 'VAR'
<<EOF>>                 return 'EOF'
.                       return 'INVALID'

/lex

%start empty

%% /* language grammar */

empty
    : EOF
    ;
