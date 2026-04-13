# Apogee Roadmap

## Phase 1: Python Transpiler (Now)

*Status: Complete* | [Milestone](https://github.com/apogee-lang/apogee/milestone/1)

The bootstrap compiler. Proves the language design by transpiling Apogee to Python 3.11+.

- [x] Lexer with string interpolation and backtick identifiers
- [x] Recursive descent parser with full AST
- [x] Type checker — null safety, constraint types, inference
- [x] Python emitter — dataclasses, f-strings, asyncio.gather
- [x] CLI: compile, run, check
- [x] 20-program test suite
- [x] Language spec (EBNF grammar)
- [ ] LSP server for editor integration
- [ ] Package manager (`apogee add`, `apogee.toml`)
- [ ] REPL (`apogee repl`)
- [ ] Standard library: full implementations of io, collections, http, data

## Phase 2: Native LLVM Backend (Month 6)

[Milestone](https://github.com/apogee-lang/apogee/milestone/2)

Compile Apogee directly to machine code via LLVM IR. Unlocks performance-critical use cases.

- [ ] LLVM IR emitter replacing the Python emitter
- [ ] Memory model: ownership tracking (Rust-inspired, but simplified)
- [ ] Zero-cost abstractions for constraint types
- [ ] Compile-time evaluation of pure functions
- [ ] Debug info generation (DWARF)
- [ ] Cross-compilation support
- [ ] Benchmark suite (vs Python, Go, Rust)

## Phase 3: WebAssembly Target (Month 12)

[Milestone](https://github.com/apogee-lang/apogee/milestone/3)

Run Apogee in browsers and edge runtimes. First-class web platform support.

- [ ] WASM code generation
- [ ] DOM interop via `@extern` bindings
- [ ] Async model mapping to web platform Promises
- [ ] Bundle size optimization (tree shaking, dead code elimination)
- [ ] wasm-bindgen-style TypeScript type generation
- [ ] Playground: browser-based Apogee editor at apogee-lang.dev

## Phase 4: JVM Target (Month 18)

[Milestone](https://github.com/apogee-lang/apogee/milestone/4)

Run Apogee on the JVM for enterprise and Android use cases.

- [ ] JVM bytecode generation
- [ ] Java interop — call Java libraries from Apogee
- [ ] Android support
- [ ] Gradle plugin
- [ ] Spring Boot starter

## Long-Term Vision

- **AI intent verification**: Static analysis that proves `@intent` annotations match implementation
- **Formal verification**: Integration with SMT solvers for constraint type proofs
- **Multi-target compilation**: Single `.apg` codebase compiling to Python, native, WASM, and JVM
- **Self-hosting**: Apogee compiler written in Apogee
