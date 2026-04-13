# Changelog

All notable changes to Apogee are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-04-12

### Added

- **Lexer**: Full tokenizer with string interpolation (`\(expr)`), backtick identifiers, nested block comments
- **Parser**: Recursive descent parser producing complete AST — functions, types, let bindings, for/while loops, if/else, match expressions, query expressions, spawn blocks
- **Type Checker**: Null safety enforcement, constraint type validation at compile time, type inference, struct field checking, undefined variable detection
- **Python Emitter**: Generates valid Python 3.11+ — dataclasses for types, f-strings for interpolation, `asyncio.gather()` for spawn, list comprehensions for queries, runtime constraint validation via `__post_init__`
- **CLI**: `apogee compile`, `apogee run`, `apogee check` commands with colored error output
- **Standard Library**: Skeleton modules for io, collections, http, data operations
- **Test Suite**: 20 test programs — 15 success tests, 5 compile-time error tests
- **Language Spec**: Full EBNF grammar in `spec/SPEC.md`

[Unreleased]: https://github.com/apogee-lang/apogee/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/apogee-lang/apogee/releases/tag/v0.1.0
