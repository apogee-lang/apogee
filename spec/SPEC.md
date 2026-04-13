# Apogee Language Specification

**Version 0.1.0** | Status: Draft | File extension: `.apg`

---

## 1. Notation

This specification uses Extended Backus-Naur Form (EBNF) with the following conventions:

| Notation | Meaning |
|---|---|
| `'literal'` | Terminal string |
| `UPPER_CASE` | Token produced by the lexer |
| `lower_case` | Grammar production rule |
| `A B` | Sequence (A then B) |
| `A \| B` | Alternative (A or B) |
| `[ A ]` | Optional (zero or one) |
| `{ A }` | Repetition (zero or more) |
| `( A )` | Grouping |
| `(* ... *)` | Comment |

---

## 2. Lexical Grammar

### 2.1 Source Text

Apogee source files are UTF-8 encoded. Line endings are `\n` (LF) or `\r\n` (CRLF), normalized to LF.

### 2.2 Whitespace and Comments

```ebnf
whitespace     = ' ' | '\t' | '\r' ;
line_comment   = '//' { any_char - '\n' } '\n' ;
block_comment  = '/*' { block_comment | any_char } '*/' ;
                 (* block comments nest *)
```

### 2.3 Keywords

```ebnf
keyword = 'fn' | 'type' | 'let' | 'return'
        | 'if' | 'else' | 'for' | 'in' | 'while' | 'match'
        | 'from' | 'where' | 'spawn'
        | 'import' | 'async' | 'await'
        | 'true' | 'false' | 'null' ;
```

Keywords cannot be used as identifiers. Use backtick syntax for identifiers that conflict.

### 2.4 Identifiers

```ebnf
IDENT          = ident_start { ident_continue } ;
ident_start    = 'a'..'z' | 'A'..'Z' | '_' ;
ident_continue = ident_start | '0'..'9' ;

BACKTICK_IDENT = '`' { any_char - '`' } '`' ;
                 (* multi-word identifiers: `add numbers` *)
```

### 2.5 Literals

```ebnf
INT_LIT    = digit { digit } ;
FLOAT_LIT  = digit { digit } '.' digit { digit } ;
BOOL_LIT   = 'true' | 'false' ;
NULL_LIT   = 'null' ;

STRING_LIT = '"' { string_char } '"' ;
string_char = escape_seq | interpolation | any_char - '"' - '\\' - '\n' ;
escape_seq  = '\\' ( 'n' | 't' | 'r' | '\\' | '"' ) ;
interpolation = '\\(' expression ')' ;
               (* string interpolation: "Hello, \(name)!" *)

digit = '0'..'9' ;
```

### 2.6 Operators and Punctuation

```ebnf
(* Arithmetic *)
PLUS = '+' ;  MINUS = '-' ;  STAR = '*' ;  SLASH = '/' ;  PERCENT = '%' ;

(* Comparison *)
EQEQ = '==' ;  NEQ = '!=' ;  LT = '<' ;  GT = '>' ;  LTE = '<=' ;  GTE = '>=' ;

(* Logical *)
AND = '&&' ;  OR = '||' ;  NOT = '!' ;

(* Assignment and arrows *)
EQ = '=' ;  ARROW = '->' ;  FAT_ARROW = '=>' ;

(* Punctuation *)
LPAREN = '(' ;  RPAREN = ')' ;  LBRACE = '{' ;  RBRACE = '}' ;
LBRACKET = '[' ;  RBRACKET = ']' ;
DOT = '.' ;  COMMA = ',' ;  COLON = ':' ;  SEMICOLON = ';' ;
QUESTION = '?' ;  AT = '@' ;  PIPE = '|' ;
```

---

## 3. Syntax Grammar

### 3.1 Program

```ebnf
program = { statement } EOF ;
```

### 3.2 Statements

```ebnf
statement = fn_decl
          | type_decl
          | let_stmt
          | return_stmt
          | for_stmt
          | while_stmt
          | if_stmt
          | import_stmt
          | assign_stmt
          | expr_stmt ;

fn_decl = [ intent_annotation ] [ 'async' ] 'fn' fn_name '(' [ param_list ] ')' [ '->' type ] block ;

fn_name = IDENT | BACKTICK_IDENT ;

param_list = param { ',' param } ;
param      = IDENT [ ':' type ] [ '=' expression ] ;

intent_annotation = '@intent' '(' STRING_LIT ')' ;

type_decl = 'type' IDENT '{' { type_field } '}' ;
type_field = IDENT ':' type [ '=' expression ] ;

let_stmt    = 'let' IDENT [ ':' type ] '=' expression ;
return_stmt = 'return' [ expression ] ;
import_stmt = 'import' IDENT { '.' IDENT } ;

for_stmt   = 'for' IDENT 'in' expression block ;
while_stmt = 'while' expression block ;
if_stmt    = 'if' expression block { 'else' ( if_stmt | block ) } ;

assign_stmt = expression '=' expression ;
expr_stmt   = expression ;
```

### 3.3 Blocks

```ebnf
block = '{' { statement } [ expression ] '}' ;
        (* the trailing expression is the block's implicit return value *)
```

### 3.4 Types

```ebnf
type = simple_type [ '?' ] [ 'where' expression ]
     | list_type [ '?' ]
     | function_type [ '?' ] ;

simple_type   = IDENT ;
               (* built-in: Int, Float, String, Bool, Void, Any *)
               (* user-defined: any PascalCase identifier *)

list_type     = '[' type ']' ;
function_type = '(' [ type { ',' type } ] ')' '->' type ;
```

**Nullable suffix** (`?`): Indicates the value may be `null`. Without `?`, null is a compile-time error.

**Constraint clause** (`where`): Attaches a boolean predicate to the type. The identifier in the predicate refers to the value being checked.

### 3.5 Expressions

```ebnf
expression = or_expr ;

or_expr     = and_expr { '||' and_expr } ;
and_expr    = eq_expr { '&&' eq_expr } ;
eq_expr     = cmp_expr { ( '==' | '!=' ) cmp_expr } ;
cmp_expr    = add_expr { ( '<' | '>' | '<=' | '>=' ) add_expr } ;
add_expr    = mul_expr { ( '+' | '-' ) mul_expr } ;
mul_expr    = unary_expr { ( '*' | '/' | '%' ) unary_expr } ;
unary_expr  = ( '-' | '!' ) unary_expr | postfix_expr ;
postfix_expr = primary_expr { call | member | index | null_check } ;

call       = '(' [ expression { ',' expression } ] ')' ;
member     = '.' IDENT ;
index      = '[' expression ']' ;
null_check = '?' ;
             (* safe access: returns null if receiver is null *)

primary_expr = INT_LIT | FLOAT_LIT | STRING_LIT | BOOL_LIT | NULL_LIT
             | IDENT [ struct_literal ]
             | BACKTICK_IDENT
             | '(' expression ')'
             | list_literal
             | if_expr
             | query_expr
             | spawn_expr
             | match_expr
             | 'await' expression
             | block ;

struct_literal = '{' field_init { ',' field_init } '}' ;
field_init     = IDENT ':' expression ;

list_literal = '[' [ expression { ',' expression } ] ']' ;

if_expr    = 'if' expression '{' expression '}' [ 'else' '{' expression '}' ] ;
query_expr = 'from' expression [ 'where' expression ] ;
             (* implicit variable `it` refers to each element *)
spawn_expr = 'spawn' '{' { expression [ ';' ] } '}' ;
match_expr = 'match' expression '{' { expression '=>' expression ',' } '}' ;
```

#### Operator Precedence (low to high)

| Level | Operators | Associativity |
|-------|-----------|---------------|
| 1 | `\|\|` | Left |
| 2 | `&&` | Left |
| 3 | `==` `!=` | Left |
| 4 | `<` `>` `<=` `>=` | Left |
| 5 | `+` `-` | Left |
| 6 | `*` `/` `%` | Left |
| 7 | `!` `-` (prefix) | Right |
| 8 | `()` `.` `[]` `?` (postfix) | Left |

---

## 4. Type System

### 4.1 Built-in Types

| Apogee | Python | Size | Description |
|--------|--------|------|-------------|
| `Int` | `int` | Arbitrary | Arbitrary-precision integer |
| `Float` | `float` | 64-bit | IEEE 754 double |
| `String` | `str` | Variable | UTF-8 string, immutable |
| `Bool` | `bool` | 1 byte | `true` or `false` |
| `Void` | `None` | 0 | Absence of value |
| `Any` | `object` | Variable | Escape hatch, bypasses checking |

### 4.2 Nullable Types

A type suffixed with `?` allows the value to be `null`.

```apogee
let a: String = "hello"   // OK
let b: String = null       // COMPILE ERROR
let c: String? = null      // OK
let d: String? = "hello"   // OK — non-nullable assignable to nullable
```

**Rules:**

1. `T` is assignable to `T?`, but `T?` is NOT assignable to `T`
2. Member access on `T?` requires the `?` operator: `value?.member`
3. `null` has type `T?` for any `T` — resolved by context

### 4.3 Constraint Types

A `where` clause attaches a compile-time or runtime predicate to a type.

```apogee
Int where value > 0           // positive integer
String where len(value) > 0   // non-empty string
```

When used in type declarations, the field name is the predicate variable:

```apogee
type User {
  age: Int where age >= 0     // `age` is the variable in the predicate
}
```

**Checking rules:**

1. **Literal values**: Checked at compile time. `User { age: -1 }` is a compile error.
2. **Runtime values**: Checked at construction time via generated validation code.
3. **Type compatibility**: `Int where value > 0` is assignable to `Int`, but not vice versa.

### 4.4 Collection Types

```apogee
[T]              // List of T — ordered, indexed, mutable
```

Future: `Map[K, V]`, `Set[T]`.

### 4.5 Function Types

```apogee
(Int, Int) -> Int       // function taking two Ints, returning Int
(String) -> Void        // function taking a String, returning nothing
() -> Bool              // nullary function returning Bool
```

### 4.6 Type Inference

Variable types are inferred from their initializer when no annotation is provided:

```apogee
let x = 42          // inferred: Int
let s = "hello"     // inferred: String
let xs = [1, 2, 3]  // inferred: [Int]
```

Function return types can be inferred from the body's final expression but explicit annotation is preferred.

---

## 5. Memory Model

### 5.1 Current (Python Backend)

All values are reference-counted and garbage-collected by the Python runtime. No manual memory management.

### 5.2 Future (LLVM Backend)

Planned ownership model:

- **Owned values**: Default. Single owner, moved on assignment.
- **Borrowed references**: Read-only access without ownership transfer.
- **Unique references**: Mutable access with single-reference guarantee.

The exact semantics are TBD and will be specified in a future revision.

---

## 6. Concurrency Model

### 6.1 Spawn Blocks

```apogee
spawn {
  task_a()
  task_b()
  task_c()
}
```

**Semantics:**

1. All expressions in the spawn block execute concurrently
2. The spawn expression completes when ALL tasks complete
3. If any task fails, all others are cancelled (structured concurrency)
4. Returns the results as a tuple (future: typed)

**Compilation:** Maps to `asyncio.gather()` in the Python backend.

### 6.2 Async Functions

```apogee
async fn fetch_data(url: String) -> String {
  // ...
}
```

Async functions return a future that must be awaited:

```apogee
let result = await fetch_data("https://example.com")
```

---

## 7. Annotations

### 7.1 @intent

```apogee
@intent("description of what this function should do")
fn name(params) -> ReturnType {
  body
}
```

**Semantics:**

1. The string describes the intended behavior in natural language
2. Compiled to a docstring in the current backend
3. Future: AI verification tools will check implementation against intent
4. Future: Formal verification via intent-to-specification translation

**Rules:**

- `@intent` must appear immediately before a function declaration
- The argument must be a string literal (not an expression)
- Multiple `@intent` annotations on the same function are an error

---

## 8. Modules

### 8.1 Import

```apogee
import module_name
import module_name.submodule
```

Imports make all public declarations from the module available in the current scope.

### 8.2 Standard Library Modules

| Module | Contents |
|--------|----------|
| `io` | `print`, `read`, `read_file`, `write_file` |
| `collections` | `list_push`, `list_pop`, `map_get`, `map_set`, `set_add` |
| `http` | `fetch`, `post`, `serve` |
| `data` | `filter`, `map_list`, `sort`, `reduce`, `find` |

---

## 9. Error Model

The compiler produces three categories of errors, each with line:column position and a fix suggestion:

### 9.1 Lex Errors

Triggered during tokenization.

- Unterminated string literal
- Unexpected character
- Unterminated block comment
- Unterminated backtick identifier

### 9.2 Parse Errors

Triggered during AST construction.

- Missing delimiter (`{`, `}`, `(`, `)`)
- Unexpected token
- Malformed declaration

### 9.3 Type Errors

Triggered during type checking.

- **Null safety**: Assigning `null` to a non-nullable type
- **Constraint violation**: Literal value fails `where` predicate
- **Undefined variable**: Reference to undeclared name
- **Missing field**: Struct literal missing a required field
- **Unknown field**: Struct literal contains a field not in the type
- **Type mismatch**: Expression type incompatible with expected type
- **Return type**: Function body type doesn't match declared return type

---

## 10. Compilation Targets

| Target | Status | Command |
|--------|--------|---------|
| Python 3.11+ | Implemented | `apogee compile file.apg` |
| LLVM IR | Planned (Phase 2) | — |
| WebAssembly | Planned (Phase 3) | — |
| JVM bytecode | Planned (Phase 4) | — |
