# Apogee Language Specification

**Version 0.1.0** — Draft

## 1. Overview

Apogee is a statically-typed programming language designed for the AI era. It compiles to Python 3.11+ and provides compile-time memory safety, null-safe types, structured concurrency, and `@intent` annotations for AI verification.

**File extension:** `.apg`

## 2. Lexical Grammar

```
program        → statement* EOF
statement      → fn_decl | type_decl | let_stmt | for_stmt | while_stmt
               | if_stmt | expr_stmt | return_stmt | import_stmt | assign_stmt

// Literals
INT_LIT        → [0-9]+
FLOAT_LIT      → [0-9]+ '.' [0-9]+
STRING_LIT     → '"' (escape | interp | [^"\\])* '"'
BOOL_LIT       → 'true' | 'false'
escape         → '\\' [ntr"\\]
interp         → '\\(' expr ')'

// Identifiers
IDENT          → [a-zA-Z_][a-zA-Z0-9_]*
BACKTICK_IDENT → '`' [^`]+ '`'

// Keywords
keyword        → 'fn' | 'type' | 'spawn' | 'let' | 'from' | 'where'
               | 'if' | 'else' | 'return' | 'import' | 'async' | 'await'
               | 'null' | 'true' | 'false' | 'in' | 'for' | 'while' | 'match'

// Comments
line_comment   → '//' [^\n]* '\n'
block_comment  → '/*' (block_comment | .)* '*/'   // nestable
```

## 3. Type System

### 3.1 Built-in Types

| Apogee Type | Python Mapping | Description |
|---|---|---|
| `Int` | `int` | Arbitrary-precision integer |
| `Float` | `float` | 64-bit floating point |
| `String` | `str` | UTF-8 string |
| `Bool` | `bool` | Boolean |
| `Void` | `None` | No value |
| `Any` | `object` | Escape hatch |

### 3.2 Nullable Types

```
type? — the value may be null

let name: String? = null   // OK
let name: String = null    // COMPILE ERROR
```

### 3.3 Constraint Types

```
Int where value > 0        // positive integers only
String where len(value) > 0  // non-empty strings

type User {
  age: Int where age >= 0  // constraint checked at construction
}
```

Constraints on literal values are checked at compile time. Runtime values are checked via `__post_init__` validation.

### 3.4 Collection Types

```
[T]            — List of T    → list[T]
```

### 3.5 Function Types

```
(A, B) -> C    — function taking A, B returning C
```

## 4. Declarations

### 4.1 Functions

```
fn name(param: Type, ...) -> ReturnType {
  body
}
```

- The last expression in a block is the implicit return value.
- Multi-word names: `` fn `add numbers`(a: Int, b: Int) -> Int ``
- Async functions: `async fn fetch_data() -> String { ... }`

### 4.2 Type Definitions

```
type Name {
  field1: Type
  field2: Type = default_value
}
```

Compiles to a Python `@dataclass`. Fields with constraint types generate `__post_init__` validation.

### 4.3 Variables

```
let x = 42              // immutable binding, type inferred
let y: String = "hello" // explicit type annotation
```

## 5. Expressions

### 5.1 Operators

| Precedence | Operators | Associativity |
|---|---|---|
| 1 (lowest) | `\|\|` | Left |
| 2 | `&&` | Left |
| 3 | `==` `!=` | Left |
| 4 | `<` `>` `<=` `>=` | Left |
| 5 | `+` `-` | Left |
| 6 | `*` `/` `%` | Left |
| 7 (highest) | `!` `-` (unary) | Right |

### 5.2 String Interpolation

```
"Hello, \(name)!"   →   f"Hello, {name}!"
```

### 5.3 Query Expressions

```
from collection where condition
```

Compiles to list comprehension: `[it for it in collection if condition]`

The implicit variable `it` refers to each element.

### 5.4 Spawn Blocks (Structured Concurrency)

```
spawn {
  fetch("url1")
  fetch("url2")
}
```

Compiles to: `asyncio.gather(fetch("url1"), fetch("url2"))`

### 5.5 If Expressions

```
if condition { value1 } else { value2 }
```

### 5.6 Match Expressions

```
match x {
  1 => "one",
  2 => "two",
  3 => "three"
}
```

## 6. Annotations

### 6.1 @intent

```
@intent("description of what this function does")
fn name(...) -> Type { ... }
```

Compiles to a docstring and serves as documentation for AI verification tools.

## 7. Modules

```
import module_name
```

## 8. Error Handling

The compiler produces errors with:
- Line and column numbers
- Descriptive messages
- Fix suggestions where possible

Categories:
- **Lex errors**: Unterminated strings, unexpected characters
- **Parse errors**: Missing braces, unexpected tokens
- **Type errors**: Null safety violations, constraint violations, undefined variables
