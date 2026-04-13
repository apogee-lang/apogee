# Functions and Intent

## Declaring Functions

Functions in Apogee are declared with `fn`, followed by a name, parameters, an optional return type, and a body:

```
fn add(a: Int, b: Int) -> Int {
  a + b
}

print(add(3, 4))  // 7
```

The last expression in a function body is the implicit return value. No `return` keyword needed — though you can use one for early exits:

```
fn absolute(n: Int) -> Int {
  if n >= 0 { return n }
  -1 * n
}

print(absolute(-7))   // 7
print(absolute(3))    // 3
```

Parameters must have type annotations. Return types are optional but recommended:

```
// Explicit return type — recommended for public functions
fn greet(name: String) -> String {
  "Hello, \(name)!"
}

// Inferred return type — fine for small internal helpers
fn double(n: Int) {
  n * 2
}
```

## @intent: The Compiler As Your Pair Programmer

Here's the feature that defines Apogee. Every function can carry an `@intent` annotation — a natural language description of what the function is *supposed* to do.

```
@intent("return the full name by combining first and last, never null")
fn full_name(first: String, last: String) -> String {
  "\(first) \(last)"
}
```

`@intent` is not a comment. It's not a docstring. It's a *semantic annotation* that:

1. **Compiles to a Python docstring** — so it's preserved in the output
2. **Is machine-readable** — AI tools can parse and verify it
3. **Serves as a contract** — the function's intent is explicit, not implicit
4. **Lives next to the code** — not in a separate wiki or Notion doc

### Why This Matters

Consider two functions with identical signatures:

```
fn process(data: [Int]) -> [Int] {
  // ... 50 lines of code ...
}
```

Without `@intent`, you have to read all 50 lines to understand what `process` does. Does it sort? Filter? Deduplicate? Transform?

```
@intent("remove duplicates and sort ascending, preserve original list")
fn process(data: [Int]) -> [Int] {
  // Now you know what to expect.
}
```

The intent declaration is a promise. Today, the compiler preserves it as documentation. In the future, AI verification tools will check that the implementation matches the intent — and flag mismatches as warnings.

### Writing Good Intents

Good intents are specific, verifiable, and mention edge cases:

```
// Good:
@intent("return the user's display name, fall back to email if name is empty")
fn display_name(user: User) -> String {
  if user.name != "" { user.name } else { user.email }
}

// Good:
@intent("calculate total price including tax, never return negative")
fn total(items: [Item]) -> Float {
  // ...
}

// Bad — too vague:
// @intent("process the data")

// Bad — describes implementation, not intent:
// @intent("loop through items and sum prices then multiply by 1.1")
```

The rule: **describe what, not how.** Someone reading the intent should understand the function's purpose without reading the body.

## Multi-Word Function Names

Sometimes a function's best name is multiple words. In most languages, you'd use `snake_case` or `camelCase`. Apogee supports both — plus backtick syntax for truly readable names:

```
fn `calculate total with tax`(subtotal: Float, rate: Float) -> Float {
  subtotal * (1.0 + rate)
}

let total = `calculate total with tax`(100.0, 0.08)
print(total)  // 108.0
```

Backtick identifiers compile to snake_case in Python:

```python
# Compiled output:
def calculate_total_with_tax(subtotal: float, rate: float) -> float:
    return (subtotal * (1.0 + rate))
```

Use backtick names when the natural-language name is clearer than any identifier convention. They're especially useful with `@intent`:

```
@intent("check if the user is old enough to access the resource")
fn `is old enough`(user: User, min_age: Int) -> Bool {
  user.age >= min_age
}
```

## Default Parameters

Parameters can have default values:

```
fn greet(name: String, greeting: String = "Hello") -> String {
  "\(greeting), \(name)!"
}

print(greet("Tyler"))              // Hello, Tyler!
print(greet("Tyler", "Welcome"))   // Welcome, Tyler!
```

## Functions Are Values

Functions can be passed as arguments and stored in variables:

```
fn apply(n: Int, transform: (Int) -> Int) -> Int {
  transform(n)
}

fn double(n: Int) -> Int { n * 2 }
fn square(n: Int) -> Int { n * n }

print(apply(5, double))   // 10
print(apply(5, square))   // 25
```

This makes functions composable. You can build pipelines of transformations:

```
fn process_all(numbers: [Int], transform: (Int) -> Int) -> [Int] {
  let result = [transform(1)]
  result
}
```

## The Difference Between What Code Does and What Code Means

This is the philosophical heart of Apogee's design.

Most languages capture *what code does* — the mechanics, the operations, the control flow. But they lose *what code means* — the purpose, the intent, the contract.

```
// What this code does: multiply price by quantity, add a percentage
fn calculate(price: Float, qty: Int, tax: Float) -> Float {
  price * qty * (1.0 + tax)
}

// What this code means:
@intent("calculate the final invoice amount including sales tax")
fn invoice_total(price: Float, quantity: Int, tax_rate: Float) -> Float {
  price * quantity * (1.0 + tax_rate)
}
```

Same logic. But the second version tells you *why* the code exists and *what it's for*. The name is clearer. The intent is explicit. A developer (or AI) encountering this function for the first time understands it instantly.

Apogee's position: **meaning should be preserved in the code, not lost in a meeting.** `@intent` is the mechanism. The type system is the enforcer.

> **vs Python**
>
> ```python
> # Python
> def calculate(price, qty, tax):
>     """Calculate the final invoice amount including sales tax."""
>     return price * qty * (1 + tax)
> ```
>
> Python has docstrings, which serve a similar purpose. But docstrings are:
> - Not checked by any tool (by default)
> - Easily forgotten or outdated
> - Freeform text with no standard structure
>
> Apogee's `@intent` is a deliberate, structured annotation that tools can parse. It's the difference between a suggestion and a contract.

## Async Functions

Functions that perform I/O or need to run concurrently are marked `async`:

```
async fn fetch_data(url: String) -> String {
  // In the current Python backend, this maps to an async def
  "response data"
}

async fn process() -> String {
  let data = await fetch_data("https://api.example.com")
  "Processed: \(data)"
}
```

Async functions can be used in `spawn` blocks for concurrent execution (covered in Chapter 6).

## Common Mistakes

**Forgetting that the last expression is the return value.** If your function ends with a `let` statement, the return value is `Void`, not the variable you just bound.

```
// Wrong — returns Void
fn bad(n: Int) {
  let result = n * 2
}

// Right — returns Int
fn good(n: Int) -> Int {
  n * 2
}
```

**Putting a semicolon after the last expression.** In Apogee, a trailing semicolon (or newline after a statement) means "this is a statement, not a return value."

**Writing intent that describes the implementation.** The intent should describe *what*, not *how*. "Loop through items and sum" is implementation. "Calculate the total price" is intent.

## What You Learned

- How to declare functions with `fn`, parameters, and return types
- `@intent` annotations as semantic contracts
- Backtick syntax for multi-word function names
- Implicit return (last expression) vs explicit `return`
- Default parameters and functions as values
- The difference between what code does and what code means

## Try It Yourself

1. Write a function `@intent("convert celsius to fahrenheit")` with the formula `celsius * 9 / 5 + 32`. Test it with several values.

2. Write two functions with `@intent`: one to filter a list of numbers to only positives, and one to sum a list. Chain them: sum the positives in `[-3, 5, -1, 8, -2, 4]`.

3. Create a multi-word function using backtick syntax: `` fn `is valid email`(email: String) -> Bool ``. Have it check that the string contains "@" (hint: this is a toy example — real email validation is harder).
