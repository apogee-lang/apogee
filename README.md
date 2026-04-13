# Apogee

[![CI](https://github.com/apogee-lang/apogee/actions/workflows/ci.yml/badge.svg)](https://github.com/apogee-lang/apogee/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-green.svg)](https://www.python.org/downloads/)

**The programming language built for the AI era.**
Compile-time safety. Intent verification. Runs everywhere.

```apogee
@intent("greet the user by name, never null")
fn greet(name: String) -> String {
  "Hello, \(name)! Welcome to Apogee."
}

type User {
  name: String
  age: Int where age >= 0
}

let user = User { name: "Tyler", age: 35 }
print(greet(user.name))
```

```
$ apogee run hello.apg
Hello, Tyler! Welcome to Apogee.
```

---

## Install

```bash
pip install apogee-lang
```

Or from source:

```bash
git clone https://github.com/apogee-lang/apogee.git
cd apogee
pip install -e .
apogee --help
```

## CLI

| Command | Description |
|---|---|
| `apogee compile <file.apg>` | Transpile to Python (.py) |
| `apogee run <file.apg>` | Compile and execute immediately |
| `apogee check <file.apg>` | Type-check only, no output |

## Why Apogee?

### 1. Null safety at compile time

```apogee
let name: String = get_name()    // must return String, not null
let maybe: String? = find_user() // nullable — callers must handle it
print(maybe?.name)               // safe access with ?
```

### 2. Constraint types

```apogee
type User {
  name: String
  age: Int where age >= 0    // compiler rejects User { age: -1 }
}
```

The compiler catches `User { age: -1 }` at build time. Runtime values are validated at construction.

### 3. `@intent` annotations

```apogee
@intent("sort users by age descending, preserve original list")
fn sorted_by_age(users: [User]) -> [User] { ... }
```

Machine-readable contracts that AI tools can verify against the implementation.

### 4. Structured concurrency

```apogee
spawn {
  fetch_users()
  fetch_posts()
}
// Both complete before execution continues. No dangling tasks.
```

### 5. Query expressions

```apogee
let adults = from users where it.age >= 18
```

Read more: [Why Apogee?](docs/WHY_APOGEE.md) | [Comparison table vs Python, TypeScript, Rust, Go](docs/WHY_APOGEE.md#comparison)

## Documentation

| Document | Description |
|---|---|
| [Language Spec](spec/SPEC.md) | Full EBNF grammar, type system rules, semantics |
| [Why Apogee?](docs/WHY_APOGEE.md) | Design rationale and language comparison |
| [Contributing](CONTRIBUTING.md) | Build from source, add features, code style |
| [Changelog](CHANGELOG.md) | Release history |
| [Roadmap](ROADMAP.md) | Python → LLVM → WASM → JVM |

## Running Tests

```bash
python -m tests.test_runner
```

20 test programs covering all language features: functions, types, constraints, string interpolation, query expressions, spawn blocks, `@intent`, and 5 compile-time error tests.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The short version:

1. Fork and clone
2. `pip install -e .`
3. Make changes following the pipeline: **spec → lexer → parser → typechecker → emitter → tests**
4. `python -m tests.test_runner` — all green
5. Open a PR

Issues labeled [`good first issue`](https://github.com/apogee-lang/apogee/labels/good%20first%20issue) are a great place to start.

## Roadmap

| Phase | Target | Timeline |
|---|---|---|
| 1 | Python transpiler | **Now** |
| 2 | Native LLVM backend | Month 6 |
| 3 | WebAssembly target | Month 12 |
| 4 | JVM target | Month 18 |

See [ROADMAP.md](ROADMAP.md) for details.

## License

MIT
