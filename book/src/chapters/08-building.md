# Building Real Things

## Project Structure

A real Apogee project has a simple structure:

```
myproject/
├── main.apg          # entry point
├── models.apg        # type definitions
├── handlers.apg      # business logic
└── utils.apg         # helpers
```

There's no `src` directory, no `__init__.py`, no `package.json`. Just `.apg` files. Import what you need:

```
// main.apg
import models
import handlers
```

For now, the import system maps to Python's module system after compilation. Organize your code how you'd organize Python modules.

## Example 1: HTTP Server in 15 Lines

Here's a complete API server. It defines a type, a handler, and serves requests:

```
type ApiResponse {
  status: Int where status >= 100
  body: String
}

@intent("return a greeting for the given name, never null")
fn handle_greet(name: String) -> ApiResponse {
  ApiResponse {
    status: 200,
    body: "Hello, \(name)! Welcome to the Apogee API."
  }
}

@intent("health check endpoint, always returns 200")
fn handle_health() -> ApiResponse {
  ApiResponse { status: 200, body: "ok" }
}

// Entry point
let response = handle_greet("Tyler")
print("\(response.status): \(response.body)")

let health = handle_health()
print("\(health.status): \(health.body)")
```

```
200: Hello, Tyler! Welcome to the Apogee API.
200: ok
```

The constraint `status >= 100` means you can't accidentally return a response with an invalid HTTP status. The `@intent` annotations document each endpoint's purpose.

To serve this over HTTP, compile to Python and use any Python web framework (Flask, FastAPI, etc.) with the compiled output:

```bash
apogee compile server.apg
# Then wrap with FastAPI, Flask, etc.
```

## Example 2: CLI Tool with Argument Parsing

```
type CliArgs {
  command: String
  verbose: Int
}

@intent("parse simple CLI arguments from a list of strings")
fn parse_args(args: [String]) -> CliArgs {
  let cmd = if len(args) > 0 { args[0] } else { "help" }
  CliArgs { command: cmd, verbose: 0 }
}

@intent("display help text for all available commands")
fn show_help() {
  print("Usage: mytool <command>")
  print("")
  print("Commands:")
  print("  greet    Say hello")
  print("  version  Show version")
  print("  help     Show this message")
}

@intent("display the current version number")
fn show_version() {
  print("mytool v0.1.0 (powered by Apogee)")
}

@intent("greet the user with a friendly message")
fn cmd_greet() {
  print("Hello from mytool!")
  print("Built with Apogee — the AI-era language.")
}

// Main dispatch
let args = parse_args(["greet"])

if args.command == "greet" {
  cmd_greet()
} else {
  if args.command == "version" {
    show_version()
  } else {
    show_help()
  }
}
```

```
Hello from mytool!
Built with Apogee — the AI-era language.
```

Every command handler has an `@intent`. Every type constraint is enforced. The structure is clear and linear.

## Example 3: Data Pipeline — Read, Transform, Query

This is where Apogee's query expressions combine with types to create something genuinely powerful:

```
type CsvRow {
  name: String
  department: String
  salary: Int where salary >= 0
  years: Int where years >= 0
}

@intent("build employee records from raw data")
fn build_records() -> [CsvRow] {
  [
    CsvRow { name: "Alice Chen", department: "Engineering", salary: 125000, years: 5 },
    CsvRow { name: "Bob Smith", department: "Marketing", salary: 85000, years: 3 },
    CsvRow { name: "Carol Davis", department: "Engineering", salary: 140000, years: 8 },
    CsvRow { name: "Dan Wilson", department: "Sales", salary: 95000, years: 4 },
    CsvRow { name: "Eve Brown", department: "Engineering", salary: 115000, years: 2 },
    CsvRow { name: "Frank Lee", department: "Marketing", salary: 78000, years: 1 },
    CsvRow { name: "Grace Kim", department: "Engineering", salary: 155000, years: 10 },
    CsvRow { name: "Hank Jones", department: "Sales", salary: 88000, years: 6 }
  ]
}

@intent("filter to a specific department")
fn by_department(employees: [CsvRow], dept: String) -> [CsvRow] {
  from employees where it.department == dept
}

@intent("filter to employees with at least min_years of tenure")
fn senior(employees: [CsvRow], min_years: Int) -> [CsvRow] {
  from employees where it.years >= min_years
}

@intent("find employees earning above a threshold")
fn high_earners(employees: [CsvRow], threshold: Int) -> [CsvRow] {
  from employees where it.salary > threshold
}

// Pipeline
let all = build_records()

// Engineering team analysis
let eng = by_department(all, "Engineering")
print("Engineering team:")
for e in eng {
  print("  \(e.name) — \(e.years) years — $\(e.salary)")
}

// Senior engineers earning over 120k
let senior_eng = senior(eng, 5)
let top_earners = high_earners(senior_eng, 120000)
print("Senior engineers earning >$120k:")
for e in top_earners {
  print("  \(e.name)")
}

// Cross-department: all employees with 5+ years
let veterans = senior(all, 5)
print("Company veterans (5+ years):")
for e in veterans {
  print("  \(e.name) (\(e.department))")
}
```

```
Engineering team:
  Alice Chen — 5 years — $125000
  Carol Davis — 8 years — $140000
  Eve Brown — 2 years — $115000
  Grace Kim — 10 years — $155000
Senior engineers earning >$120k:
  Carol Davis
  Grace Kim
Company veterans (5+ years):
  Alice Chen (Engineering)
  Carol Davis (Engineering)
  Grace Kim (Engineering)
  Hank Jones (Sales)
```

This is a complete data pipeline: load data → filter by department → filter by tenure → filter by salary → output. Each function has an `@intent`. Each filter is a type-safe query.

> **vs Python**
>
> ```python
> # Python equivalent
> eng = [e for e in all if e.department == "Engineering"]
> senior_eng = [e for e in eng if e.years >= 5]
> top = [e for e in senior_eng if e.salary > 120000]
> ```
>
> Python's list comprehensions work, but there's no type checking on field names. Mistype `e.departmnet` and you get a runtime error. Apogee catches it at compile time.

## Example 4: Match Expression Calculator

```
@intent("evaluate a simple math operation")
fn calculate(a: Int, op: String, b: Int) -> Int {
  match op {
    "+" => a + b,
    "-" => a - b,
    "*" => a * b
  }
}

print(calculate(10, "+", 5))    // 15
print(calculate(10, "-", 3))    // 7
print(calculate(10, "*", 4))    // 40
```

## Example 5: Report Generator

```
type MetricRow {
  label: String
  value: Int where value >= 0
  target: Int where target >= 0
}

@intent("format a single metric line with pass/fail indicator")
fn format_metric(m: MetricRow) -> String {
  let status = if m.value >= m.target { "PASS" } else { "FAIL" }
  "\(m.label): \(m.value)/\(m.target) [\(status)]"
}

@intent("generate a full report from a list of metrics")
fn generate_report(metrics: [MetricRow]) -> String {
  let failing = from metrics where it.value < it.target
  let report_header = "=== Performance Report ==="
  print(report_header)
  for m in metrics {
    print(format_metric(m))
  }
  let fail_count = len(failing)
  if fail_count > 0 {
    print("\(fail_count) metric(s) below target")
  } else {
    print("All metrics on target")
  }
  report_header
}

let metrics = [
  MetricRow { label: "Uptime", value: 99, target: 95 },
  MetricRow { label: "Response Time", value: 180, target: 200 },
  MetricRow { label: "Error Rate", value: 5, target: 2 },
  MetricRow { label: "Throughput", value: 1200, target: 1000 }
]

generate_report(metrics)
```

```
=== Performance Report ===
Uptime: 99/95 [PASS]
Response Time: 180/200 [PASS]
Error Rate: 5/2 [FAIL]
Throughput: 1200/1000 [PASS]
1 metric(s) below target
```

## Common Mistakes

**Building too much before testing.** Apogee's compile step is fast. Use `apogee check` after every change. Catching errors in 5-line increments is easier than debugging 50 lines.

**Not using types for domain modeling.** If you have a concept (User, Order, Metric), give it a type. Types are documentation that the compiler checks.

**Writing giant functions instead of composing small ones.** Each function should have one clear `@intent`. If you can't write the intent in one sentence, the function does too much.

## What You Learned

- How to structure a real Apogee project
- Building an API server with typed responses
- Building a CLI tool with command dispatch
- Building a data pipeline with chained queries
- How types, constraints, intents, and queries compose into real applications

## Try It Yourself

1. Build a contact book: a `Contact` type with `name`, `email`, `phone`, and a `favorite` flag. Write functions to add, list, search by name, and list favorites.

2. Create a data pipeline that processes a list of products: filter by category, sort concept (query by price threshold), and generate a formatted report.

3. Build a simple calculator that reads an operation string like `"add"`, `"sub"`, `"mul"` and two numbers, then prints the result using match expressions.
