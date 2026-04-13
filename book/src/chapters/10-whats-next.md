# What's Next

## The Roadmap

Apogee is at the beginning. The Python transpiler (v0.1) proves the language design works — the types are sound, the query syntax is natural, the `@intent` annotations are useful, and the compiler catches real bugs. But this is Phase 1 of a four-phase plan.

### Phase 1: Python Transpiler (Now)

This is where we are today. Apogee compiles to Python 3.11+, which means:

- You can use Apogee in any environment that runs Python
- The compiled output is readable, idiomatic Python
- You get Apogee's compile-time guarantees with Python's runtime ecosystem

What's shipping next in Phase 1:
- **LSP server** — full editor integration (autocomplete, hover, go-to-definition) in VS Code
- **Package manager** — `apogee add`, `apogee.toml` for dependencies
- **REPL** — `apogee repl` for interactive exploration
- **Standard library** — full implementations of io, collections, http, data modules

### Phase 2: Native LLVM Backend (Month 6)

This is the big one. Compiling Apogee directly to machine code via LLVM IR means:

- **10-100x faster execution** for compute-heavy programs
- **Ownership model** with compile-time memory safety (no garbage collector)
- **Zero-cost abstractions** — constraint types checked at compile time have no runtime overhead
- **Cross-compilation** — compile on macOS, target Linux, Windows, ARM
- **Debug info** — step through Apogee source in lldb/gdb

The ownership model (Chapter 5) will be fully realized in this phase.

### Phase 3: WebAssembly Target (Month 12)

Run Apogee in browsers and edge runtimes:

- **DOM interop** via `@extern` bindings
- **Web platform integration** — spawn blocks map to Web Workers
- **Bundle optimization** — tree shaking, dead code elimination
- **TypeScript type generation** — consume Apogee modules from TypeScript
- **Playground upgrade** — the browser playground runs native WASM, not transpiled Python

### Phase 4: JVM Target (Month 18)

Run Apogee on the Java Virtual Machine:

- **Java interop** — call Java libraries from Apogee
- **Android support** — write Android apps in Apogee
- **Enterprise deployment** — run on existing JVM infrastructure
- **Gradle/Maven plugins** — integrate with Java build systems

## How to Contribute

Apogee is open source and actively seeking contributors. Here's how to get involved:

### Your First Contribution

Start with issues labeled [`good first issue`](https://github.com/apogee-lang/apogee/labels/good%20first%20issue). These are scoped, well-documented tasks that touch 1-2 files:

- Add a new built-in function to the type checker
- Improve an error message with a better suggestion
- Add a test case for an edge case
- Fix a formatting issue in the Python emitter

### The Feature Pipeline

Every new language feature follows the same pipeline:

1. **Spec** — Write the syntax and semantics in `spec/SPEC.md`
2. **Lexer** — Add new tokens to `src/lexer.py`
3. **Parser** — Add parsing rules to `src/parser.py`
4. **Type Checker** — Add type-checking logic to `src/typechecker.py`
5. **Emitter** — Add Python code generation to `src/emitter.py`
6. **Tests** — Add test programs to `tests/test_runner.py`

See [CONTRIBUTING.md](https://github.com/apogee-lang/apogee/blob/main/CONTRIBUTING.md) for the full guide.

### What We Need

The Apogee project needs contributors in several areas:

**Compiler engineers** — help build the LLVM backend. This is the most technically demanding work and the highest impact.

**Language designers** — propose and discuss new features in [Language Design issues](https://github.com/apogee-lang/apogee/issues/new?template=language_design.md). Every feature must be justified, specified, and reviewed.

**Documentation writers** — improve the book, write tutorials, create examples. Good documentation is what makes developers stay.

**Tool builders** — VS Code extension improvements, LSP enhancements, formatter, linter, package manager.

**Community builders** — help newcomers, answer questions, write blog posts, give talks.

## The Apogee Foundation

Apogee is maintained by the Apogee Foundation, an open source organization focused on programming language design for the AI era.

The foundation's principles:

1. **Open development** — all design decisions happen in public GitHub discussions
2. **Backward compatibility** — we don't break existing `.apg` programs without a migration path
3. **Compiler-first** — if a guarantee can be enforced at compile time, it must be
4. **AI-native** — every feature is evaluated for its impact on AI-generated code quality

## Community

### GitHub

Everything happens on GitHub:
- **Repository**: [github.com/apogee-lang/apogee](https://github.com/apogee-lang/apogee)
- **Issues**: Bug reports, feature requests, language design discussions
- **Discussions**: Q&A, show-and-tell, announcements
- **Pull Requests**: Code contributions with CI enforcement

### The Playground

[apogee-lang.dev](https://apogee-lang.dev) is the easiest way to try Apogee. Share programs by clicking the Share button — it generates a permalink with your code encoded in the URL.

## A Final Program

Here's a program that uses everything you've learned in this book:

```
// Types with constraints
type Article {
  title: String
  author: String
  words: Int where words > 0
  published: Int
}

// Intent-annotated functions
@intent("find all published articles by a specific author")
fn by_author(articles: [Article], name: String) -> [Article] {
  from articles where it.author == name && it.published == 1
}

@intent("find long-form articles over a word count threshold")
fn long_reads(articles: [Article], min_words: Int) -> [Article] {
  from articles where it.words >= min_words
}

@intent("generate a reading list summary")
fn reading_list(articles: [Article]) -> String {
  let count = len(articles)
  "\(count) articles in your reading list"
}

// Data
let library = [
  Article { title: "Why Apogee Exists", author: "Tyler", words: 3200, published: 1 },
  Article { title: "Types That Matter", author: "Tyler", words: 4500, published: 1 },
  Article { title: "Draft: Ownership", author: "Tyler", words: 2100, published: 0 },
  Article { title: "Concurrency Primer", author: "Jordan", words: 5200, published: 1 },
  Article { title: "Query Patterns", author: "Jordan", words: 3800, published: 1 },
  Article { title: "AI and Languages", author: "Tyler", words: 6100, published: 1 }
]

// Pipeline: Tyler's published long-form articles
let tylers = by_author(library, "Tyler")
let long = long_reads(tylers, 3000)

print(reading_list(long))
for a in long {
  print("  \(a.title) (\(a.words) words)")
}
```

```
2 articles in your reading list
  Types That Matter (4500 words)
  AI and Languages (6100 words)
```

Types with constraints. Intent annotations. Query expressions. Chained data pipelines. Clean, readable, type-safe code.

This is Apogee. Welcome.

---

## What You Learned (In This Whole Book)

1. **Why Apogee exists** — the seven problems every language got wrong, and how Apogee solves them
2. **Getting started** — install, run, compile, check, playground
3. **Types** — primitives, nullable types, constraint types, inference
4. **Functions** — declaration, `@intent`, multi-word names, implicit returns
5. **Ownership** — the future memory model, inferred by the compiler
6. **Concurrency** — `spawn` blocks, structured concurrency, async
7. **Data** — `from`/`where` queries, typed pipelines, collection operations
8. **Building real things** — servers, CLIs, data pipelines, reports
9. **AI integration** — system prompts, edit-compile-fix loop, verifiable intents
10. **What's next** — LLVM, WASM, JVM, and how to contribute

## Try It Yourself: The Final Challenge

Build something real. Pick one:

1. **A personal expense tracker** — types for transactions, queries for monthly totals, constraints on amounts
2. **A link shortener API** — types for URLs, functions for encoding/decoding, intent annotations for every handler
3. **A Markdown-to-HTML converter** — string processing, pattern matching, structured output

Build it in Apogee. Compile it. Share it at [apogee-lang.dev](https://apogee-lang.dev). Show the world what AI-era code looks like.
