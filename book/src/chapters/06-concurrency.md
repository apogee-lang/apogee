# Concurrency For Normal People

## Why Concurrency Is Usually Hard

Concurrency means doing multiple things at the same time. It should be simple. It isn't — because most languages give you tools that are powerful but dangerous:

**Threads** share memory. Two threads writing to the same variable at the same time? Data race. Two threads each waiting for the other to release a lock? Deadlock.

**Callbacks** turn linear logic into nested spaghetti. Error handling becomes guesswork. The execution order is invisible.

**Promises/Futures** are better, but you can forget to `await` one and lose work silently. You can create a promise that's never consumed. You can accidentally create infinite chains.

**async/await** is the best of these, but it creates the "colored function problem" — async functions can't call sync functions naturally, splitting your codebase into two worlds.

Apogee takes a different approach: **structured concurrency as a language primitive.**

## Spawn Blocks

The `spawn` block is Apogee's concurrency primitive. Every expression inside a `spawn` block runs concurrently. The block completes when *all* tasks complete.

```
spawn {
  fetch_users()
  fetch_posts()
  fetch_comments()
}
// Execution continues here only after ALL three complete.
print("All data loaded")
```

This compiles to:

```python
asyncio.gather(fetch_users(), fetch_posts(), fetch_comments())
print('All data loaded')
```

That's it. No thread pools, no executor services, no callback registration, no promise chains. You say "do these things concurrently" and the compiler handles the rest.

## A Real Example: Parallel API Calls

Let's build something practical — a function that fetches data from multiple endpoints in parallel:

```
async fn fetch_users() -> String {
  "['alice', 'bob', 'charlie']"
}

async fn fetch_orders() -> String {
  "[{id: 1, total: 99.99}, {id: 2, total: 49.50}]"
}

async fn fetch_inventory() -> String {
  "[{sku: 'A1', count: 150}, {sku: 'B2', count: 0}]"
}

// All three requests run at the same time:
let data = spawn {
  fetch_users()
  fetch_orders()
  fetch_inventory()
}

print("Dashboard loaded")
```

In a traditional sequential approach, if each API call takes 200ms, the total time is 600ms. With `spawn`, all three run in parallel — total time is ~200ms. Same result, 3x faster.

> **vs Python**
>
> ```python
> # Python equivalent
> import asyncio
>
> async def load_dashboard():
>     users, orders, inventory = await asyncio.gather(
>         fetch_users(),
>         fetch_orders(),
>         fetch_inventory()
>     )
>     print("Dashboard loaded")
>
> asyncio.run(load_dashboard())
> ```
>
> Python requires you to understand `asyncio`, `gather`, `await`, and async context managers. You need to call `asyncio.run()` to enter the async world. If you forget `await`, your coroutine silently does nothing.
>
> Apogee: `spawn { a(); b(); c() }`. Done.

## Structured Concurrency: Why It Matters

The key property of `spawn` blocks is **structure**: the concurrent work has a clear beginning and end. This guarantees:

### 1. No Dangling Tasks

Every task started in a `spawn` block completes (or is cancelled) before execution continues past the block. You can't "fire and forget" a task that outlives its scope.

```
spawn {
  slow_operation()     // takes 5 seconds
  fast_operation()     // takes 10ms
}
// BOTH are done before this line executes.
// You can't accidentally leak slow_operation().
```

### 2. Error Propagation

If any task in a `spawn` block fails, the error propagates to the `spawn` block's caller. No lost errors, no silently swallowed exceptions.

### 3. Deterministic Cleanup

Resources acquired inside a `spawn` block are released when the block exits — whether tasks succeeded or failed.

## Parallel Data Processing

Concurrency isn't just for I/O. It's also useful for CPU-bound work on large datasets:

```
type DataSet {
  values: [Int]
}

fn process_chunk(data: [Int]) -> Int {
  // Simulate heavy computation
  let sum = 0
  for d in data {
    // sum = sum + d * d
  }
  sum
}

// Process different data sets in parallel:
let result = spawn {
  process_chunk([1, 2, 3, 4, 5])
  process_chunk([6, 7, 8, 9, 10])
  process_chunk([11, 12, 13, 14, 15])
}

print("All chunks processed")
```

## Async Functions

Any function that needs to participate in concurrent execution is marked `async`:

```
async fn download(url: String) -> String {
  // In the real world, this would make an HTTP request
  "content from \(url)"
}

async fn process_url(url: String) -> String {
  let content = await download(url)
  "Processed: \(content)"
}
```

The `await` keyword pauses the current function until the async operation completes. Inside a `spawn` block, `await`-ed operations on different tasks run concurrently.

## The Safety Guarantee

In the LLVM backend (future), Apogee will guarantee: **if it compiles, it has no data races.** This is achieved by combining the ownership model (Chapter 5) with the spawn model:

- Tasks in a `spawn` block cannot share mutable state
- Data passed into a `spawn` task is either copied or moved
- Communication between tasks uses channels (see below)

On the current Python backend, this guarantee relies on Python's GIL and asyncio's cooperative scheduling — which inherently prevent data races in single-threaded async code.

## Communication: Channels (Future)

For the LLVM backend, Apogee will support channels — typed, bounded communication pipes between concurrent tasks:

```
// Future syntax (planned for LLVM backend):
// let ch = channel(Int, 10)  // buffered channel of Int, capacity 10
//
// spawn {
//   // Producer
//   for i in range(100) {
//     ch.send(i)
//   }
//
//   // Consumer
//   for val in ch {
//     print(val)
//   }
// }
```

Channels provide safe communication without shared mutable state. Go popularized this pattern; Apogee will adopt it with type safety and capacity constraints.

## Combining Spawn with Query Expressions

Concurrency and data queries compose naturally:

```
type ApiResult {
  endpoint: String
  status: Int where status >= 100
  latency_ms: Int where latency_ms >= 0
}

fn check_endpoint(url: String) -> ApiResult {
  ApiResult { endpoint: url, status: 200, latency_ms: 45 }
}

let endpoints = [
  "https://api.example.com/users",
  "https://api.example.com/posts",
  "https://api.example.com/health"
]

// Check all endpoints (would be parallel with async):
let results = [
  check_endpoint("https://api.example.com/users"),
  check_endpoint("https://api.example.com/posts"),
  check_endpoint("https://api.example.com/health")
]

// Query the results:
let slow = from results where it.latency_ms > 100
let errors = from results where it.status >= 400

print("Slow endpoints:")
for r in slow {
  print(r.endpoint)
}

print("Errors:")
for r in errors {
  print(r.endpoint)
}
```

## Common Mistakes

**Trying to share mutable variables between spawn tasks.** Each task should work on its own data. If you need to combine results, do it after the spawn block completes.

**Forgetting that spawn blocks are expressions.** The `spawn` block produces a value (the gathered results). You can bind it to a variable.

**Using spawn for sequential work.** If task B depends on task A's result, don't put them in the same spawn block. Spawn is for *independent* concurrent work.

```
// Wrong — if task B needs task A's result:
// spawn { let a = task_a(); task_b(a) }

// Right — sequence them:
let a = task_a()
let b = task_b(a)
```

## What You Learned

- Why traditional concurrency primitives (threads, callbacks, promises) are error-prone
- `spawn` blocks for structured concurrency
- The three guarantees: no dangling tasks, error propagation, deterministic cleanup
- Async functions and `await`
- Parallel API calls and data processing patterns
- Future: channels for inter-task communication

## Try It Yourself

1. Write three async functions that simulate API calls (just return strings). Use a `spawn` block to call all three concurrently.

2. Create a list of URLs and write a function that "fetches" each one. Use `spawn` to process them in parallel.

3. Think about a real application you've built. Identify two or three operations that could run in parallel. How would you express that with `spawn`?
