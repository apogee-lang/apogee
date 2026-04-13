# Types That Tell The Truth

## Why Types Exist

Types aren't about syntax. They're about contracts.

When you write `fn greet(name: String) -> String`, you're not just telling the compiler what bytes to expect. You're making a *promise*: this function will receive text and will produce text. Not a number. Not null. Not an error code. Text.

Every time you use a type, you're adding a fact to the codebase that the compiler can verify. More facts mean more bugs caught before runtime. Apogee's type system is designed to let you state the facts that actually matter.

## Primitive Types

Apogee has five primitive types:

| Type | Values | Python equivalent |
|------|--------|-------------------|
| `Int` | `0`, `42`, `-7` | `int` |
| `Float` | `3.14`, `-0.5` | `float` |
| `String` | `"hello"`, `"world"` | `str` |
| `Bool` | `true`, `false` | `bool` |
| `Void` | (no value) | `None` |

```
let count = 42          // Int
let pi = 3.14159        // Float
let name = "Apogee"     // String
let active = true       // Bool
```

You rarely need to write type annotations on `let` bindings. The compiler infers the type from the value. But you *can* be explicit when you want to:

```
let count: Int = 42
let name: String = "Apogee"
```

Explicit annotations are most useful on function parameters and return types, where they serve as documentation and contracts.

## Nullable Types: The `?` That Changes Everything

Here's the single most important idea in Apogee's type system:

**`String` and `String?` are different types.**

`String` means "this is definitely a string." It cannot be null. Ever. The compiler guarantees it.

`String?` means "this might be a string, or it might be null." The compiler forces you to handle both cases.

```
// This function always returns a String. No exceptions.
fn get_greeting() -> String {
  "Hello!"
}

// This function might return null.
fn find_user(id: Int) -> String? {
  if id == 1 { "Tyler" } else { null }
}
```

Now here's where the compiler earns its keep:

```
let name = find_user(42)     // name is String?

// This won't compile:
// print(name.length)
// ERROR: Cannot access .length on String? — value might be null

// This compiles:
print(name?.length)          // null-safe access — prints null if name is null
```

The `?` after a type name means "nullable." The `?` after a variable means "if this is null, return null instead of crashing."

```
// You can also check explicitly:
let user = find_user(1)
if user != null {
  print(user)                // inside this block, user is known non-null
}
```

> **vs Python**
>
> ```python
> # Python
> def find_user(id):
>     return "Tyler" if id == 1 else None
>
> name = find_user(42)
> print(name.upper())  # AttributeError: 'NoneType' object has no attribute 'upper'
> ```
>
> Python gives you no warning. The crash happens at runtime — maybe in production, maybe at 3am. Apogee catches it at compile time. Always.

## Constraint Types: Intent in the Type System

This is the feature that makes experienced programmers stop and think.

Most types answer the question "what kind of data is this?" Constraint types answer the question "what values are valid?"

```
type User {
  name: String
  age: Int where age >= 0
  email: String
}
```

That `where age >= 0` is not a comment. It's not a convention. It's a *type constraint* enforced by the compiler.

```
// Compile-time check on literal values:
let user = User { name: "Tyler", age: 35, email: "t@example.com" }  // OK
// let bad = User { name: "X", age: -1, email: "x" }
// COMPILE ERROR: Constraint violation: age = -1 does not satisfy age >= 0
```

When the value isn't a literal — it comes from user input, an API, a database — the constraint generates runtime validation:

```
// The compiled Python includes:
// def __post_init__(self):
//     if not (self.age >= 0):
//         raise ValueError(f"Constraint violation on age: {self.age}...")
```

This is the key insight: **constraints that can be checked at compile time are. Everything else is checked at runtime. You never need to write the validation yourself.**

### Constraint Types for Domain Modeling

Constraints let you model your domain precisely:

```
type HttpResponse {
  status: Int where status >= 100
  body: String
}

type Coordinate {
  lat: Float where lat >= -90
  lng: Float where lng >= -180
}

type Password {
  value: String
}

type Port {
  number: Int where number > 0
}
```

Every one of these types is self-documenting *and* self-validating. A `Port` with `number: -1` cannot exist. Not because you wrote an `if` statement somewhere — because the type system forbids it.

> **vs Python**
>
> In Python, you'd need Pydantic, `@validator` decorators, or manual `__post_init__` checks in every dataclass. And there's no standard — every project invents its own validation pattern. Apogee makes constraints part of the language.

## Collection Types

Lists are written with square brackets around the element type:

```
let numbers: [Int] = [1, 2, 3, 4, 5]
let names: [String] = ["Alice", "Bob", "Charlie"]
let empty: [Int] = []
```

Type inference works for collections too:

```
let numbers = [1, 2, 3]     // inferred: [Int]
let names = ["Alice", "Bob"] // inferred: [String]
```

Access elements by index:

```
let first = numbers[0]       // 1
let length = len(numbers)    // 3
```

Iterate with `for`:

```
for n in numbers {
  print(n)
}
```

## Type Inference: You Don't Always Have to Write the Type

Apogee infers types from context. You only need annotations where you want to be explicit — typically function signatures and type fields.

```
// All of these are valid — the compiler infers the types:
let x = 42                   // Int
let greeting = "hello"       // String
let pi = 3.14               // Float
let active = true            // Bool
let items = [1, 2, 3]       // [Int]
```

Function return types can also be inferred from the body:

```
fn double(n: Int) -> Int {
  n * 2
}

// You could omit -> Int and the compiler would infer it.
// But explicit return types on functions are good documentation.
```

The rule of thumb: **annotate function signatures, infer everything else.** Your future self (and your AI pair programmer) will thank you for the function annotations.

## The "No Null Pointer Exception" Guarantee

Let's make this concrete. In Apogee, the following program *cannot* crash with a null pointer error:

```
fn process(data: String) -> String {
  "Processed: \(data)"
}

fn get_data() -> String {
  "some data"
}

let result = process(get_data())
print(result)
```

Why? Because `get_data` returns `String` (not `String?`), and `process` takes `String` (not `String?`). The compiler knows null can't appear anywhere in this chain.

If you *need* to handle nullability, the type system forces you to be explicit:

```
fn maybe_get_data(id: Int) -> String? {
  if id > 0 { "data" } else { null }
}

let data = maybe_get_data(0)

// Option 1: null-safe access
let processed = data?.length

// Option 2: provide a default
let safe = if data != null { data } else { "default" }

print(safe)
```

This isn't a style suggestion. It's the *only* way to access nullable values. The compiler won't let you ignore null.

## Putting It All Together

```
type Product {
  name: String
  price: Float where price >= 0
  stock: Int where stock >= 0
}

fn describe(p: Product) -> String {
  "\(p.name): $\(p.price) (\(p.stock) in stock)"
}

fn in_stock(products: [Product]) -> [Product] {
  from products where it.stock > 0
}

let catalog = [
  Product { name: "Keyboard", price: 79.99, stock: 15 },
  Product { name: "Mouse", price: 29.99, stock: 0 },
  Product { name: "Monitor", price: 349.99, stock: 8 }
]

let available = in_stock(catalog)
for p in available {
  print(describe(p))
}
```

```
Keyboard: $79.99 (15 in stock)
Monitor: $349.99 (8 in stock)
```

In this example:
- No product can have a negative price or negative stock (constraint types)
- `describe` always returns a String (never null)
- `in_stock` uses a query expression to filter
- Every type tells the truth about what values are valid

## Common Mistakes

**Trying to use a nullable value without `?` or a null check.** The compiler will stop you. Read the error — it tells you exactly what to do.

```
// ERROR: Cannot access .name on User? — value might be null
// Fix: use user?.name or check for null first
```

**Forgetting a required field in a struct literal.** The compiler knows the type definition and checks every field.

```
// type User { name: String, age: Int }
// let u = User { name: "Tyler" }
// ERROR: Missing fields in User: age
```

**Putting a constraint on a field and using a variable name that doesn't match.** The constraint variable must match the field name.

```
// This works:
type User { age: Int where age >= 0 }

// This is a different constraint variable:
type Limit { value: Int where value > 0 }
```

## What You Learned

- The five primitive types: Int, Float, String, Bool, Void
- Nullable types (`T?`) and why they're different from non-nullable types
- Constraint types (`Int where value >= 0`) and how they're enforced
- Type inference — when to annotate and when to let the compiler figure it out
- Why Apogee guarantees no null pointer exceptions

## Try It Yourself

1. Create a `BankAccount` type with `balance: Float where balance >= 0` and `owner: String`. Make a list of accounts and use `from ... where` to find accounts with a balance over 1000.

2. Write a function that takes a `String?` parameter and returns a greeting if the name exists, or `"Hello, stranger!"` if it's null.

3. Try creating a `Product { name: "Free Thing", price: -5.0, stock: 10 }` and read the compiler error carefully.
