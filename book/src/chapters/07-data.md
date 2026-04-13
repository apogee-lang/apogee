# Data As A First-Class Citizen

## The from/where Query Syntax

Most programs are data processing pipelines: read data, filter it, transform it, output it. Apogee makes this the most natural thing in the language.

```
let numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

let evens = from numbers where it % 2 == 0
print(evens)   // [2, 4, 6, 8, 10]

let big = from numbers where it > 7
print(big)     // [8, 9, 10]
```

The `from ... where ...` syntax is a query expression. It reads like English: "from this collection, give me the items where this condition is true."

The implicit variable `it` refers to each element. No need to name a lambda parameter or write a loop variable.

This compiles to Python list comprehensions:

```python
evens = [it for it in numbers if (it % 2) == 0]
big = [it for it in numbers if it > 7]
```

Same semantics. But the Apogee version is clearer about intent: you're *querying* data, not writing a loop.

## Working with Structured Data

Query expressions shine with typed data:

```
type Employee {
  name: String
  department: String
  salary: Int where salary >= 0
  active: Int
}

let team = [
  Employee { name: "Alice", department: "Engineering", salary: 120000, active: 1 },
  Employee { name: "Bob", department: "Marketing", salary: 90000, active: 1 },
  Employee { name: "Charlie", department: "Engineering", salary: 110000, active: 0 },
  Employee { name: "Diana", department: "Engineering", salary: 130000, active: 1 },
  Employee { name: "Eve", department: "Marketing", salary: 95000, active: 1 }
]

// Active engineers:
let engineers = from team where it.department == "Engineering" && it.active == 1
for e in engineers {
  print(e.name)
}

// High earners:
let well_paid = from team where it.salary > 100000
for e in well_paid {
  print("\(e.name): $\(e.salary)")
}
```

```
Alice
Diana
Alice: $120000
Charlie: $110000
Diana: $130000
```

The compiler knows the type of `it` inside the query — it's `Employee`. So `it.name`, `it.salary`, and `it.department` are all type-checked. Misspell a field name? Compile error.

## Chaining Queries

Queries compose naturally. The result of one query is a list — which can be the input to another:

```
type Task {
  title: String
  priority: Int where priority >= 1
  done: Int
  assigned_to: String
}

let tasks = [
  Task { title: "Deploy v2", priority: 5, done: 0, assigned_to: "Alice" },
  Task { title: "Write tests", priority: 3, done: 1, assigned_to: "Bob" },
  Task { title: "Fix bug #42", priority: 4, done: 0, assigned_to: "Alice" },
  Task { title: "Update docs", priority: 2, done: 0, assigned_to: "Charlie" },
  Task { title: "Code review", priority: 3, done: 0, assigned_to: "Bob" }
]

// Pipeline: pending tasks → high priority → assigned to Alice
let pending = from tasks where it.done == 0
let urgent = from pending where it.priority >= 4
let alice_urgent = from urgent where it.assigned_to == "Alice"

for t in alice_urgent {
  print("\(t.title) (P\(t.priority))")
}
```

```
Deploy v2 (P5)
Fix bug #42 (P4)
```

Each step narrows the data. The types flow through automatically — `pending` is `[Task]`, `urgent` is `[Task]`, `alice_urgent` is `[Task]`.

## Type-Safe Queries

Because Apogee knows the type of your data, queries are checked at compile time:

```
type User {
  name: String
  age: Int where age >= 0
}

let users = [
  User { name: "Tyler", age: 35 },
  User { name: "Jordan", age: 28 }
]

// This compiles:
let adults = from users where it.age >= 18

// This would NOT compile:
// let bad = from users where it.email == "test"
// ERROR: Type 'User' has no field 'email'
```

You can't query on a field that doesn't exist. You can't compare a String to an Int. The compiler catches it.

> **vs Python**
>
> ```python
> # Python — no type checking on queries
> adults = [u for u in users if u.age >= 18]      # works
> bad = [u for u in users if u.email == "test"]    # AttributeError at RUNTIME
> ```
>
> Python's list comprehensions are powerful but unchecked. Apogee's query expressions give you the same power with compile-time safety.

## Working with Collections

Beyond `from ... where`, Apogee supports standard collection operations:

```
let numbers = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5]

// Length
print(len(numbers))    // 11

// Indexing
print(numbers[0])      // 3
print(numbers[4])      // 5

// Iteration
for n in numbers {
  print(n)
}
```

## Building Data Pipelines

Here's a complete data pipeline — the kind of thing you'd build in a real application:

```
type SaleRecord {
  product: String
  quantity: Int where quantity >= 0
  unit_price: Float where unit_price >= 0
  region: String
}

let sales = [
  SaleRecord { product: "Widget", quantity: 100, unit_price: 9.99, region: "North" },
  SaleRecord { product: "Gadget", quantity: 50, unit_price: 24.99, region: "South" },
  SaleRecord { product: "Widget", quantity: 200, unit_price: 9.99, region: "South" },
  SaleRecord { product: "Gizmo", quantity: 75, unit_price: 14.99, region: "North" },
  SaleRecord { product: "Gadget", quantity: 30, unit_price: 24.99, region: "North" },
  SaleRecord { product: "Widget", quantity: 150, unit_price: 9.99, region: "North" }
]

// Analysis pipeline:
let north_sales = from sales where it.region == "North"
let big_orders = from north_sales where it.quantity >= 100

print("Large North region orders:")
for s in big_orders {
  let total = s.unit_price * s.quantity
  print("  \(s.product): \(s.quantity) units = $\(total)")
}

// Widget sales across all regions:
let widget_sales = from sales where it.product == "Widget"
print("Widget sales:")
for s in widget_sales {
  print("  \(s.region): \(s.quantity) units")
}
```

```
Large North region orders:
  Widget: 100 units = $999.0
  Widget: 150 units = $1498.5
Widget sales:
  North: 100 units
  South: 200 units
  North: 150 units
```

Every step is type-safe. Every constraint is enforced. Every query is readable.

> **vs SQL / ORMs / pandas**
>
> | Approach | Type Safety | In-Language | Readable |
> |----------|------------|-------------|----------|
> | Raw SQL strings | None | No (string) | Yes |
> | ORM queries | Partial | Mostly | Varies |
> | pandas | None | Yes | Moderate |
> | LINQ (C#) | Full | Yes | Yes |
> | **Apogee from/where** | **Full** | **Yes** | **Yes** |
>
> Apogee's query syntax lives inside the language. It's type-checked like any other expression. And it reads naturally.

## Common Mistakes

**Forgetting that `it` is the implicit variable.** Inside a `from ... where` expression, `it` refers to each element. You don't declare it.

```
// Right:
let adults = from users where it.age >= 18

// Wrong:
// let adults = from users where user.age >= 18  // 'user' is undefined here
```

**Trying to use `from` on a non-list.** The `from` expression works on lists. You can't query a single value.

**Assuming queries modify the original list.** Queries produce a *new* list. The original is unchanged.

```
let all = [1, 2, 3, 4, 5]
let small = from all where it <= 3
print(all)    // [1, 2, 3, 4, 5] — unchanged
print(small)  // [1, 2, 3]
```

## What You Learned

- The `from ... where` query syntax for filtering collections
- How the implicit `it` variable works
- Chaining queries to build data pipelines
- Type-safe queries — the compiler checks field names and types
- Comparison with SQL, ORMs, pandas, and LINQ

## Try It Yourself

1. Create a `Movie` type with `title`, `year`, `rating` (constrained to 1-10), and `genre`. Build a list of 5 movies and use queries to find: all comedies, all movies rated 8+, and all movies from before 2020.

2. Build a two-step pipeline: first filter a list of employees to a specific department, then filter those to salary above a threshold.

3. Create a `LogEntry` type with `level` (String), `message` (String), and `timestamp` (Int). Query for all entries where `level == "ERROR"`.
