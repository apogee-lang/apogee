# Ownership Without Pain

## What Ownership Means

Every value in a program lives somewhere in memory. Ownership answers a simple question: *who is responsible for this value?*

In Python and JavaScript, the answer is "the garbage collector figures it out." This works, but it means memory usage is unpredictable, cleanup timing is undefined, and you can't reason about when resources are freed.

In Rust, the answer is "you, the programmer, declare ownership with explicit syntax." This produces fast, safe programs — but Rust's borrow checker has a learning curve that stops many developers cold.

Apogee takes a middle path: **ownership is inferred by the compiler, not declared by the programmer.** The compiler tracks who owns what and ensures safety — you just write natural code.

## The Current Model: Python Backend

In the current version of Apogee (v0.1, Python backend), all values are reference-counted and garbage-collected by Python's runtime. You don't need to think about ownership at all.

```
fn make_list() -> [Int] {
  [1, 2, 3, 4, 5]
}

let items = make_list()
let copy = items
print(items)   // [1, 2, 3, 4, 5] — still valid
print(copy)    // [1, 2, 3, 4, 5] — shared reference
```

This is intentional. The Python backend is about proving the language design, not about performance. When you write Apogee today, you get Python's memory model — and that's fine.

## The Future Model: Three Rules

When the LLVM backend ships (Phase 2), Apogee will introduce ownership semantics. The design philosophy is: **the compiler infers, you override only when needed.**

### Rule 1: Every value has one owner

When you create a value, the variable that receives it is the owner:

```
let name = "Tyler"   // name owns this string
let scores = [95, 87, 92]  // scores owns this list
```

### Rule 2: Values can be borrowed

When you pass a value to a function, the function borrows it. The original owner retains ownership:

```
fn print_scores(scores: [Int]) {
  for s in scores {
    print(s)
  }
}

let my_scores = [95, 87, 92]
print_scores(my_scores)  // borrows my_scores
print(my_scores)         // still valid — we still own it
```

This is different from Rust, where you'd need `&[i32]` to borrow. In Apogee, borrowing is the default for function parameters. The compiler infers whether a borrow or a move is appropriate.

### Rule 3: Ownership can be transferred

When you assign a value to a new variable in a context where the compiler determines the original is no longer used, ownership transfers:

```
fn consume(data: [Int]) -> Int {
  len(data)
}

let items = [1, 2, 3]
let count = consume(items)
// The compiler knows items is not used after this point,
// so it can transfer ownership instead of copying.
```

## How Apogee Infers Ownership

The key difference from Rust: **you don't annotate ownership.** The compiler uses data flow analysis to determine:

1. Is this value used after this point? If not, it can be moved.
2. Does this function modify the value? If not, it's a borrow.
3. Are multiple references alive at the same time? If so, they must be immutable borrows.

```
// You write this natural code:
fn process(data: [Int]) -> [Int] {
  from data where it > 0
}

let numbers = [5, -3, 8, -1, 4]
let positives = process(numbers)
print(positives)
```

The compiler decides: `numbers` is borrowed by `process` (because `from data where ...` doesn't consume `data`), and `positives` owns the new filtered list.

You never write `&`, `*`, `Box`, `Rc`, or `Arc`. The compiler handles it.

## When You Need to Be Explicit

There are cases where the compiler needs a hint. These will be rare, but they exist:

```
// Future syntax (LLVM backend):
// fn transfer(data: own [Int]) -> [Int] {
//   // data is moved in, not borrowed
//   data
// }
```

The design principle is: you only annotate ownership when the compiler asks you to. And it will ask with a clear error message explaining why.

## What Classes of Bugs Become Impossible

With the ownership model, the following bugs cannot exist in Apogee programs:

### Use After Free

```
// Impossible in Apogee:
// You can't access a value after its owner goes out of scope.
// The compiler tracks lifetimes and prevents dangling references.
```

### Double Free

```
// Impossible in Apogee:
// Each value has exactly one owner. When the owner goes out of scope,
// the value is freed exactly once.
```

### Data Races

```
// Impossible in Apogee:
// The spawn block (Chapter 6) ensures that concurrent tasks
// don't share mutable state. The compiler enforces this.
```

### Memory Leaks (Common Cases)

```
// While not all leaks are preventable, ownership ensures that
// values created in a scope are freed when the scope exits.
// No forgotten cleanup, no resource leaks from exceptions.
```

## Ownership in Practice Today

Until the LLVM backend ships, here's what ownership means for you as an Apogee developer:

1. **Write natural code.** Don't think about ownership. The Python backend handles memory.
2. **Follow the patterns.** When you write code that would be safe under ownership rules, you're writing code that will compile unchanged when the LLVM backend arrives.
3. **Use types to express contracts.** The real safety in Apogee today comes from the type system — null safety and constraints. Ownership adds the memory safety layer.

```
// This code works today AND will work with the LLVM backend:
type Config {
  host: String
  port: Int where port > 0
}

fn describe(config: Config) -> String {
  "\(config.host):\(config.port)"
}

let prod = Config { host: "api.apogee.dev", port: 443 }
print(describe(prod))
print(prod.host)  // prod is still valid — describe borrowed it
```

> **vs Python**
>
> Python has no ownership concept. Values live until the garbage collector decides they're unreachable. This means:
> - You can't predict when a file handle is closed
> - You can't guarantee a network connection is released
> - Memory usage grows unpredictably under load
>
> Apogee (with the future LLVM backend) will have deterministic cleanup: when a value's owner goes out of scope, the value is freed. Immediately. Predictably.

> **vs Rust**
>
> Rust gives you full control over ownership, borrowing, and lifetimes — at the cost of learning `&`, `&mut`, `'a`, `Box<T>`, `Rc<T>`, `Arc<T>`, and the borrow checker's error messages.
>
> Apogee's position: most programs don't need that level of control. The compiler can infer the right ownership strategy in 95% of cases. For the other 5%, you annotate. This makes Apogee accessible to developers who aren't systems programmers.

## Common Mistakes

**Worrying about ownership too early.** On the Python backend, it's irrelevant. Write clean code, use types well, and trust the compiler.

**Assuming Python-style aliasing will always work.** Today, `let a = list; let b = a` creates a shared reference. In the future, the compiler may decide this is a move if `a` isn't used again. Write code that doesn't depend on aliasing behavior.

**Ignoring immutability.** Apogee's `let` creates an immutable binding. You can't reassign a `let` variable. This is a feature — immutable values are inherently safe to share.

## What You Learned

- What ownership means and why it matters for memory safety
- The three rules: one owner, borrowing, return
- How Apogee infers ownership (vs Rust's explicit annotations)
- The current Python backend model vs the future LLVM model
- What classes of bugs ownership prevents

## Try It Yourself

1. Write a function that takes a list, filters it, and returns the result. Verify that the original list is still usable after the call.

2. Create a `Config` type and pass it to two different functions. Both should be able to read from it.

3. Think about a program you've written where a value was used after it should have been freed (use-after-free, dangling reference, or stale data). How would ownership have prevented that bug?
