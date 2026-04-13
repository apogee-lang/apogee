# Contributing to Apogee

Thank you for your interest in building the future of programming languages. This guide will get you from zero to merged PR.

## Building from Source

```bash
git clone https://github.com/apogee-lang/apogee.git
cd apogee
pip install -e ".[dev]"     # editable install with dev dependencies
python -m tests.test_runner  # verify everything works
```

**Requirements**: Python 3.11+ (3.12 recommended)

**Dev dependencies** (installed with `[dev]`):

- `ruff` — linting and formatting
- `mypy` — static type checking
- `pyinstaller` — binary builds

## Project Structure

```
src/
├── lexer.py         # Tokenizer: source text → token stream
├── parser.py        # Parser: token stream → AST
├── ast_nodes.py     # AST node definitions (types, exprs, stmts)
├── typechecker.py   # Type checker: AST → typed AST + errors
├── emitter.py       # Python emitter: typed AST → Python source
└── cli.py           # CLI entry point (compile, run, check)

spec/SPEC.md         # Language specification (EBNF grammar)
stdlib/              # Standard library .apg skeletons
tests/
└── test_runner.py   # 20+ test programs with expected output
examples/
└── showcase.apg     # The canonical Apogee demo program
```

## Adding a New Language Feature

Every feature touches the same five files in order. Here's the pipeline:

### 1. Spec (`spec/SPEC.md`)

Define the syntax and semantics in the EBNF grammar. Get consensus in a [Language Design issue](https://github.com/apogee-lang/apogee/issues/new?template=language_design.md) before writing code.

### 2. Lexer (`src/lexer.py`)

Add any new tokens or keywords. If you add a keyword, add it to the `KEYWORDS` dict.

### 3. Parser (`src/parser.py`)

Add parsing rules that produce new AST nodes. Define the new AST nodes in `src/ast_nodes.py` first.

### 4. Type Checker (`src/typechecker.py`)

Add type-checking logic for the new AST nodes. Ensure it catches errors at compile time with clear messages and fix suggestions.

### 5. Emitter (`src/emitter.py`)

Add Python code generation for the new nodes. Verify the output is valid Python 3.11+.

### 6. Tests (`tests/test_runner.py`)

Add at least:
- One success test (compiles and runs with correct output)
- One error test (compiler catches the expected mistake)

### Example: Adding a `guard` statement

```
# 1. Spec: guard condition else { ... }
# 2. Lexer: add GUARD to TokenKind and KEYWORDS
# 3. AST: add GuardStmt dataclass
# 4. Parser: handle TokenKind.GUARD in _parse_stmt()
# 5. Type checker: check condition is Bool, check body
# 6. Emitter: emit as `if not (condition): ...`
# 7. Tests: test guard with true/false conditions
```

## Code Style

- **Formatting**: `ruff format src/` — run before every commit
- **Linting**: `ruff check src/` — zero warnings policy
- **Types**: Use type annotations on all public functions
- **Errors**: Every compiler error must include line:col and a fix suggestion
- **Naming**: snake_case for functions/variables, PascalCase for AST nodes and types
- **Comments**: Only where the logic isn't self-evident. No docstrings on obvious methods.

## Commit Messages

```
Add guard statement for early returns

- Spec: added guard syntax to SPEC.md section 4.4
- Parser: handles `guard` keyword, produces GuardStmt
- Emitter: compiles to `if not ...: raise/return`
- Tests: 2 new test cases (guard_success, guard_failure)
```

Use imperative mood. First line under 72 characters. Body explains what and why.

## Running CI Locally

```bash
ruff check src/                  # lint
ruff format --check src/         # format check
mypy src/ --ignore-missing-imports  # type check
python -m tests.test_runner      # full test suite
apogee run examples/showcase.apg # smoke test
```

All of these must pass before your PR will be reviewed.

## Good First Issues

Look for issues labeled [`good first issue`](https://github.com/apogee-lang/apogee/labels/good%20first%20issue). These are scoped, well-documented tasks that touch 1-2 files:

- Add a new built-in function to the type checker
- Improve an error message with a better suggestion
- Add a new test case for an edge case
- Fix a formatting issue in the Python emitter

## Review Process

1. Open a PR with the template filled out
2. CI must be green (lint + typecheck + all tests)
3. A maintainer will review within 48 hours
4. Address feedback, then squash-merge

## Reporting Security Issues

Do **not** open a public issue. Email security@apogee-lang.dev with details.
