# Apogee

A programming language for the AI era — compile-time memory safety, null-safe types, structured concurrency, and `@intent` annotations for AI verification.

Apogee compiles to Python 3.11+.

## Installation

```bash
# Clone and install
git clone https://github.com/yourusername/apogee.git
cd apogee
pip install -e .

# Verify
apogee --help
```

## Quick Start

Create `hello.apg`:

```
print("Hello, World!")
```

Run it:

```bash
apogee run hello.apg
```

Or compile to Python:

```bash
apogee compile hello.apg    # outputs hello.py
```

## 5 Reasons to Use Apogee Over Plain Python

### 1. Null Safety at Compile Time

```
// Apogee catches null errors before runtime
let name: String = get_name()    // must return String, not null
let maybe: String? = find_user() // nullable — must handle with ?

// Python equivalent: no protection — crashes at runtime
```

### 2. Constraint Types

```
type User {
  name: String
  age: Int where age >= 0    // compiler rejects: User { age: -1 }
}

// Python equivalent: you'd need manual validation everywhere
```

### 3. @intent Annotations for AI Verification

```
@intent("greet the user by name, never return null")
fn greet(name: String) -> String {
  "Hello, \(name)!"
}

// AI tools can verify the implementation matches the intent
// Python equivalent: docstrings with no enforcement
```

### 4. Structured Concurrency

```
// Run tasks concurrently with a clear scope boundary
spawn {
  fetch("https://api.example.com/users")
  fetch("https://api.example.com/posts")
}

// Python equivalent: asyncio.gather() boilerplate
```

### 5. Query Expressions

```
let adults = from users where it.age >= 18

// Python equivalent: [u for u in users if u.age >= 18]
// Apogee's version reads more naturally
```

## CLI Commands

| Command | Description |
|---|---|
| `apogee compile <file.apg>` | Compile to Python (.py) |
| `apogee run <file.apg>` | Compile and run immediately |
| `apogee check <file.apg>` | Type-check only, no output |

## Running Tests

```bash
python -m tests.test_runner
```

## Language Specification

See [spec/SPEC.md](spec/SPEC.md) for the full language grammar and semantics.

## License

MIT
