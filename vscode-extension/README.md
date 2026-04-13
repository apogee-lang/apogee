# Apogee Language Support for VS Code

Full language support for [Apogee](https://apogee-lang.dev) — the programming language built for the AI era.

## Features

### Syntax Highlighting

Rich TextMate grammar with support for:

- Keywords (`fn`, `type`, `let`, `spawn`, `from`, `where`, `match`)
- Types in PascalCase (`String`, `Int`, `User`)
- Nullable types (`String?`) highlighted distinctly
- Constraint expressions (`Int where age >= 0`)
- String interpolation (`"Hello, \(name)!"`)
- `@intent` annotations with italic strings
- Nested block comments (`/* /* */ */`)

### Language Server

- **Diagnostics** — Real-time error detection as you type
  - Null safety violations (assigning `null` to non-nullable types)
  - Constraint violations on literal values
  - Missing `@intent` annotation hints
- **Hover** — Type information, function signatures, intent annotations
- **Autocomplete** — Keywords, types, stdlib functions, user symbols
  - Context-aware: suggests types after `:`, fields after `.`
  - `@intent` pattern suggestions
- **Go to Definition** — Jump to function/type declarations
- **Find All References** — Highlight all uses of a symbol
- **Rename Symbol** — Rename across the file
- **Format Document** — Canonical Apogee formatting
- **Code Actions**
  - Quick fix: make type nullable (`String` → `String?`)
  - Quick fix: add `@intent` annotation
  - Refactor: extract function from selection

### Snippets

| Prefix | Description |
|--------|-------------|
| `fn` | Function with `@intent` annotation |
| `type` | Type definition |
| `typec` | Type with constraint field |
| `spawn` | Spawn block (structured concurrency) |
| `from` | Query expression |
| `intent` | `@intent` annotation |
| `let` | Variable binding |
| `if` / `ife` | If / if-else |
| `for` / `while` | Loops |
| `match` | Match expression |
| `afn` | Async function |

### Commands

| Command | Keybinding | Description |
|---------|-----------|-------------|
| Apogee: Run File | `Cmd+Shift+R` | Compile and run in terminal |
| Apogee: Check File | `Cmd+Shift+T` | Type-check only |
| Apogee: Open Playground | — | Open apogee-lang.dev with current code |
| Apogee: Show Compiled Python | — | Show Python output side-by-side |

## Requirements

- [Apogee CLI](https://github.com/apogee-lang/apogee) installed (`pip install apogee-lang`)
- VS Code 1.85+

## Extension Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `apogee.compilerPath` | `"apogee"` | Path to the apogee CLI |
| `apogee.checkOnSave` | `true` | Run type checking on save |
| `apogee.formatOnSave` | `false` | Format document on save |

## Links

- [Apogee Language](https://github.com/apogee-lang/apogee)
- [Playground](https://apogee-lang.dev)
- [Language Spec](https://github.com/apogee-lang/apogee/blob/main/spec/SPEC.md)
- [Report Issues](https://github.com/apogee-lang/apogee/issues)
