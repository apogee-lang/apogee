export interface Example {
  name: string;
  code: string;
}

export const EXAMPLES: Example[] = [
  {
    name: "Hello Apogee",
    code: `// Welcome to Apogee — the AI-era programming language

fn greet(name: String) -> String {
  "Hello, \\(name)! Welcome to Apogee."
}

print(greet("World"))`,
  },
  {
    name: "Null Safety",
    code: `// Apogee prevents null errors at compile time
//
// Try removing the ? from String? below —
// the compiler will reject the null assignment.

fn find_user(id: Int) -> String? {
  if id == 1 { "Tyler" } else { null }
}

let result = find_user(1)
print(result)

let missing = find_user(99)
print(missing)`,
  },
  {
    name: "Constraint Types",
    code: `// Types can carry constraints that are checked at compile time.
// Try changing age to -1 — the compiler catches it!

type User {
  name: String
  age: Int where age >= 0
}

let user = User { name: "Tyler", age: 35 }
print(user.name)
print(user.age)

// Uncomment to see the compile error:
// let bad = User { name: "Ghost", age: -1 }`,
  },
  {
    name: "Parallel Fetch",
    code: `// spawn blocks run tasks concurrently using
// structured concurrency — all tasks complete
// before execution continues.

async fn fetch_users() -> String {
  "['alice', 'bob']"
}

async fn fetch_posts() -> String {
  "[{title: 'Hello'}]"
}

// Compiles to: asyncio.gather(fetch_users(), fetch_posts())
let results = spawn {
  fetch_users()
  fetch_posts()
}

print("Fetched all data concurrently")`,
  },
  {
    name: "Data Query",
    code: `// from/where is native query syntax
// — no .filter().map() chains needed.

let numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

let evens = from numbers where it % 2 == 0
print(evens)

let big = from numbers where it > 7
print(big)

// Works with any collection
type Task {
  title: String
  done: Int
}

let tasks = [
  Task { title: "Write compiler", done: 1 },
  Task { title: "Build REPL", done: 0 },
  Task { title: "Ship it", done: 0 }
]

let pending = from tasks where it.done == 0
for t in pending {
  print(t.title)
}`,
  },
  {
    name: "@intent Annotation",
    code: `// @intent annotations describe what a function should do.
// Today they compile to docstrings.
// Tomorrow: AI tools verify the implementation matches.

@intent("greet the user by name, never null")
fn greet(name: String) -> String {
  "Hello, \\(name)! Welcome to Apogee."
}

@intent("calculate the sum of a list of integers")
fn sum(nums: [Int]) -> Int {
  // This would be verified against the intent
  0
}

print(greet("Tyler"))`,
  },
  {
    name: "vs Python",
    code: `// Apogee vs Python — the same program, fewer bugs.
//
// APOGEE                          PYTHON
// -------                         ------
// type-checked at compile time    runtime TypeError
// null-safe by default            AttributeError: NoneType
// constraints in the type system  manual if/raise everywhere
// query syntax built-in           list comprehension noise

type Config {
  host: String
  port: Int where port > 0
  debug: Int
}

fn describe(config: Config) -> String {
  "\\(config.host):\\(config.port)"
}

let prod = Config { host: "api.apogee.dev", port: 443, debug: 0 }
let dev = Config { host: "localhost", port: 8080, debug: 1 }

print(describe(prod))
print(describe(dev))

// Try: Config { host: "bad", port: -1, debug: 0 }
// Apogee catches it at compile time. Python wouldn't.`,
  },
];
