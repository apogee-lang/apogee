# Why Apogee?

## The Problem

AI is writing more code than ever. Copilots generate functions, agents orchestrate systems, LLMs refactor entire codebases. But the languages they write *in* were designed decades before this shift.

The result is predictable:

- **AI generates null pointer crashes** because Python and JavaScript have no compile-time null safety
- **AI ignores constraints** because there's no way to express "age must be positive" in the type system
- **AI can't verify intent** because docstrings are freeform text, not machine-checkable contracts
- **AI writes unsafe concurrent code** because structured concurrency isn't the default anywhere mainstream

We keep patching this with linters, type checkers bolted on after the fact, and runtime validation libraries. Apogee asks: what if the language got it right from the start?

## How Apogee Addresses Each Gap

### 1. Null Safety Is Not Optional

In Apogee, `null` cannot appear where it isn't expected. Period.

```apogee
fn get_user(id: Int) -> User {
  // This function MUST return a User. Returning null is a compile error.
}

fn find_user(id: Int) -> User? {
  // This function may return null. Callers must handle it.
}

let user = find_user(42)
print(user.name)        // COMPILE ERROR: user is User?, not User
print(user?.name)       // OK: null-safe access
```

AI code generators produce safer code when the type system makes the safe path the only path.

### 2. Constraints Live in the Type System

Most bugs aren't type mismatches — they're *value* errors. A negative age. An empty name. A port number above 65535.

```apogee
type ServerConfig {
  host: String
  port: Int where port > 0 && port <= 65535
  max_connections: Int where max_connections > 0
}

// The compiler rejects this at build time:
let bad = ServerConfig { host: "localhost", port: -1, max_connections: 0 }
//                                          ^^^^^^^^  ^^^^^^^^^^^^^^^^^
// Constraint violation: port must be > 0 && <= 65535
// Constraint violation: max_connections must be > 0
```

No validation library needed. No forgotten checks. The type *is* the validation.

### 3. Intent Is a First-Class Concept

`@intent` annotations are machine-readable contracts that AI tools can verify.

```apogee
@intent("sort users by age descending, preserve original list")
fn sorted_by_age(users: [User]) -> [User] {
  from users where true  // BUG: this doesn't sort!
}
```

Today, `@intent` compiles to docstrings. Tomorrow, static analysis can flag that the implementation doesn't match the declared intent. This is the bridge between "what the developer wanted" and "what the code does."

### 4. Concurrency Has Structure

Spawning concurrent work in Apogee has a clear scope boundary. No dangling tasks. No forgotten awaits.

```apogee
// All tasks complete before execution continues
let results = spawn {
  fetch_users()
  fetch_posts()
  fetch_comments()
}
```

Compare this to Python's asyncio, where forgetting an `await` silently drops work, or JavaScript's unhandled promise rejections.

### 5. Query Expressions for Data

Most programs are just transforming data. Apogee makes this readable:

```apogee
let active_admins = from users where it.role == "admin" && it.active
```

No `filter()` chains. No `[x for x in ... if ...]` noise. Just say what you want.

## Comparison

| Feature | Python | TypeScript | Rust | Go | **Apogee** |
|---|---|---|---|---|---|
| Null safety | Runtime errors | `strictNullChecks` (opt-in) | `Option<T>` | Nil panics | **Built-in, mandatory** |
| Constraint types | No | No | No | No | **`where` clauses** |
| Intent annotations | Docstrings | JSDoc | Doc comments | Comments | **`@intent` (verifiable)** |
| Structured concurrency | `asyncio.TaskGroup` (3.11+) | No | Tokio tasks | Goroutines | **`spawn {}` blocks** |
| Query expressions | List comprehensions | `.filter().map()` | `.iter().filter()` | For loops | **`from X where Y`** |
| Type inference | MyPy (optional) | Yes | Yes | Partial | **Yes, mandatory** |
| Compile-time safety | No (interpreted) | Build-time (tsc) | Yes (rustc) | Yes (go build) | **Yes (apogee check)** |
| AI-era design | No | No | No | No | **Yes** |

## The Bet

Every previous era of computing produced a language designed for it:

- **Systems programming** → C (1972)
- **Object-oriented** → Java (1995)
- **Web** → JavaScript (1995)
- **Safe systems** → Rust (2010)
- **AI era** → **Apogee** (2026)

The AI era needs a language where the compiler understands not just *types*, but *intent*. Where safety isn't bolted on, but built in. Where the code AI generates is correct by construction.

That's Apogee.
