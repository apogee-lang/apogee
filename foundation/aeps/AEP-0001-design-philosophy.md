# AEP-0001: The Apogee Design Philosophy

**Author:** Tyler Walker <tyler@apogee-lang.dev>
**Status:** Accepted
**Created:** 2026-04-12
**Updated:** 2026-04-12

This is the founding document of the Apogee programming language. Every future language decision must be evaluated against the principles defined here. When two principles conflict, lower-numbered principles take precedence.

---

## The Seven Principles

### Principle 1: The Compiler Is the First Reviewer

If a bug can be caught at compile time, it must be. No class of error that is statically detectable should reach runtime. This is the non-negotiable foundation of Apogee.

**Implications:**
- Null safety is enforced by the type system, not by convention
- Constraint violations on literal values are compile-time errors
- Undefined variables are compile-time errors
- Type mismatches are compile-time errors
- Missing struct fields are compile-time errors

**Test:** For any proposed feature, ask: "Can the compiler verify this?" If yes, it must. If no, provide the strongest runtime guarantee possible.

### Principle 2: Types Tell the Truth

A type is a contract. `String` means "this is a string, never null, always present." `String?` means "this might be a string or null." `Int where value >= 0` means "this is a non-negative integer."

Types must never lie. If a type says a value has a property, that property holds at every point in the program. The compiler enforces this.

**Implications:**
- No implicit null — the `?` suffix is the only way to introduce nullability
- No implicit type coercion — `Int` does not silently become `Float`
- Constraint types are checked, not advisory
- Type inference must be sound — inferred types are as reliable as annotated types

### Principle 3: Intent Is Preserved

The purpose of code matters as much as its mechanics. Apogee preserves intent through `@intent` annotations, meaningful type names, and readable syntax.

**Implications:**
- `@intent` annotations are first-class language features, not comments
- Syntax favors readability over terseness
- Query expressions (`from ... where`) express intent better than loop mechanics
- Multi-word function names (backtick syntax) are supported for readability

**Future:** AI verification tools will check that implementations match their declared intent. The language must preserve enough semantic information to make this possible.

### Principle 4: Safe Concurrency by Default

Concurrent programs must be safe without requiring expertise in concurrency theory. If a concurrent Apogee program compiles, it has no data races.

**Implications:**
- `spawn` blocks provide structured concurrency — all tasks complete before the block exits
- No shared mutable state between concurrent tasks
- Communication between tasks uses typed channels (future)
- The async/sync distinction is minimized

### Principle 5: One Obvious Way

For any given task, there should be one clear, idiomatic way to accomplish it in Apogee. This is not about restricting expression — it's about reducing the cognitive load of reading code.

**Implications:**
- One loop syntax (`for ... in`), not three
- One conditional syntax (`if ... else`), not ternary operators
- One query syntax (`from ... where`), not multiple filter/map patterns
- Standard formatting (like `gofmt`) eliminates style debates

### Principle 6: Errors Are Helpful

Every error message must include: what went wrong, where it happened (line and column), and what to do about it. An error message that leaves the developer confused has failed.

**Implications:**
- All compiler errors include fix suggestions
- Error messages use the developer's terminology, not compiler internals
- Runtime errors from constraint violations include the constraint that was violated and the value that violated it

### Principle 7: Compilation Is Universal

Apogee programs compile to multiple targets. A single `.apg` file should produce correct output on Python, LLVM (native), WebAssembly, and the JVM.

**Implications:**
- Language features must be expressible on all targets
- Target-specific features are accessed through `@extern` annotations, not language syntax
- The spec defines semantics; backends define compilation strategy
- If a feature cannot be implemented on a target, that target documents the limitation

---

## What Apogee Will Never Do

These are permanent constraints on the language. They cannot be overridden by an AEP.

### No Undefined Behavior

Every Apogee program has defined behavior. There is no sequence of valid Apogee statements that produces "undefined behavior" as defined by the C/C++ standards. If the compiler accepts a program, its behavior is determined by the spec.

### No Implicit Null

The value `null` cannot appear in a non-nullable type. Period. There is no configuration flag, no unsafe block, no pragma that disables null safety. `String` is never null. `String?` might be null. The type tells the truth.

### No Global Interpreter Lock

Apogee's concurrency model does not depend on a GIL. On the Python backend, asyncio provides cooperative concurrency. On LLVM/WASM/JVM backends, true parallelism is supported. The language semantics are the same regardless of backend.

### No Implicit Type Coercion

`1 + "1"` is a compile error, not `"11"` or `2`. Types are explicit. Conversions are explicit. The developer's intent is never guessed.

### No Silent Failures

Operations that can fail must make failure visible. A constraint violation raises an error. A null access on a nullable type requires the `?` operator. There is no "swallow the exception and continue" behavior built into the language.

---

## The AI-Era Design Mandate

Apogee is designed for a world where AI writes most code. This has specific implications:

1. **Compile-time errors are the primary feedback mechanism.** AI assistants receive compiler errors and fix them in one iteration. The more errors caught at compile time, the fewer iterations needed.

2. **`@intent` annotations are machine-readable contracts.** They are not decorative. They exist so that AI tools can verify implementation against intent.

3. **The type system is a specification language.** When you write `Int where value >= 0`, you're writing a specification that the compiler (and future AI tools) can verify.

4. **Syntax is optimized for AI generation.** Consistent patterns, minimal ambiguity, and clear delimiters make Apogee easier for AI models to generate correctly.

---

## The Portability Mandate

Apogee targets four compilation backends:

| Target | Status | Use Case |
|--------|--------|----------|
| Python 3.11+ | Implemented | Prototyping, data science, scripting |
| LLVM IR | Planned | Performance-critical applications, systems |
| WebAssembly | Planned | Browsers, edge computing, sandboxing |
| JVM bytecode | Planned | Enterprise, Android, existing infrastructure |

Language features must be implementable on all four targets. If a feature requires target-specific behavior, that behavior is documented and the feature is gated behind a target annotation.

---

## Backwards Compatibility Policy

### The Promise

Apogee programs that compile on version N will compile on version N+1 without modification, unless:

1. The program relies on behavior explicitly documented as "subject to change"
2. A security vulnerability requires a breaking fix
3. An AEP with 4/5 Core Team approval mandates the change

### Migration Support

When a breaking change is approved via AEP:

1. The change is announced at least one minor version in advance
2. A migration tool is provided (`apogee migrate`)
3. The old behavior is deprecated with a compiler warning before removal
4. The deprecation period is at least 6 months

### Spec Versioning

The language specification is versioned alongside the compiler. The compiler reports its spec version, and programs can declare a minimum spec version:

```
// Future syntax:
// @spec("0.2")
```

---

## References

This document is inspired by:

- [The Zen of Python](https://peps.python.org/pep-0020/) (PEP 20)
- [The Rust Reference](https://doc.rust-lang.org/reference/)
- [The Go Blog: Go's Design Philosophy](https://go.dev/blog)
- [Swift Evolution Process](https://github.com/apple/swift-evolution)
- [The Elm Architecture](https://guide.elm-lang.org/architecture/)

---

*AEP-0001 is a permanent document. It can be amended by a unanimous (5/5) Core Team vote with a 30-day public comment period. The "What Apogee Will Never Do" section cannot be amended.*
