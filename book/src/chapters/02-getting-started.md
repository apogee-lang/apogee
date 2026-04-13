# Getting Started

## Installation

One command. That's the promise.

```bash
pip install apogee-lang
```

Verify it worked:

```bash
apogee --help
```

You should see:

```
usage: apogee [-h] {compile,run,check} ...

Apogee — a programming language for the AI era
```

Apogee requires Python 3.9 or newer. If you don't have Python, install it from [python.org](https://python.org) first.

## Hello World

Create a file called `hello.apg`:

```
print("Hello, World!")
```

Run it:

```bash
apogee run hello.apg
```

```
Hello, World!
```

That's it. No boilerplate. No `public static void main`. No `import sys`. Just the thing you want to do.

## Hello World: Apogee vs Python

Let's be fair — Python's Hello World is also one line:

```python
# Python
print("Hello, World!")
```

```
// Apogee
print("Hello, World!")
```

They look identical. The difference isn't in Hello World. The difference shows up the moment your program gets real. Let's make it real.

## Your First Real Program

```
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

Save this as `greet.apg` and run it:

```bash
apogee run greet.apg
```

```
Hello, Tyler! Welcome to Apogee.
```

Now look at what happened in those 11 lines:

1. **`@intent`** — You declared what the function is supposed to do, in plain English.
2. **`fn greet(name: String) -> String`** — The function takes a String and returns a String. Not maybe-a-string. Not null-if-something-goes-wrong. A String. Guaranteed.
3. **`"\(name)"`** — String interpolation. The `\( )` syntax embeds expressions inside strings.
4. **`type User`** — A structured type with named fields.
5. **`age: Int where age >= 0`** — A constraint. The compiler rejects negative ages.
6. **`User { name: "Tyler", age: 35 }`** — A struct literal. Clean, explicit, no constructor boilerplate.

> **vs Python**
>
> The equivalent Python requires a class with `__init__`, manual validation in `__post_init__` or a property setter, a docstring you hope someone reads, and zero compile-time checking. Apogee gives you all of that for free, enforced by the compiler.
>
> ```python
> # Python equivalent (manual enforcement)
> from dataclasses import dataclass
>
> @dataclass
> class User:
>     name: str
>     age: int
>     def __post_init__(self):
>         if self.age < 0:
>             raise ValueError(f"age must be >= 0, got {self.age}")
>
> def greet(name: str) -> str:
>     """Intent: greet the user by name, never null"""
>     return f"Hello, {name}! Welcome to Apogee."
>
> user = User(name="Tyler", age=35)
> print(greet(user.name))
> ```
>
> Same output. But the Apogee version is shorter, and the constraints are *enforced by the compiler*, not by convention.

## The Three Commands

Apogee has three CLI commands. That's all you need.

### `apogee run <file.apg>`

Compile and execute immediately. This is what you'll use 90% of the time during development.

```bash
apogee run hello.apg
```

### `apogee compile <file.apg>`

Transpile to Python. Produces a `.py` file you can inspect, deploy, or run with standard Python tooling.

```bash
apogee compile greet.apg
# Produces greet.py
```

Let's look at what it produces:

```bash
apogee compile greet.apg -o /dev/stdout
```

```python
from __future__ import annotations
from dataclasses import dataclass

def greet(name: str) -> str:
    """Intent: greet the user by name, never null"""
    return f"Hello, {name}! Welcome to Apogee."

@dataclass
class User:
    name: str
    age: int

    def __post_init__(self):
        if not (self.age >= 0):
            raise ValueError(f"Constraint violation on age: ...")

user = User(name='Tyler', age=35)
print(greet(user.name))
```

Clean, idiomatic Python. The `@intent` becomes a docstring. The constraint type becomes a `__post_init__` validator. You could hand this code to any Python developer and they'd understand it immediately.

### `apogee check <file.apg>`

Type-check without producing output. Use this in CI, pre-commit hooks, or when you just want to know if your code is correct.

```bash
apogee check greet.apg
# ✓ No type errors in greet.apg
```

## The Playground

Don't want to install anything? Use the browser playground at [apogee-lang.dev](https://apogee-lang.dev).

It has:
- A Monaco editor with full Apogee syntax highlighting
- Instant compilation (under 1ms for typical programs)
- Three tabs: Output, Compiled Python, and Errors
- Pre-loaded examples from the Examples dropdown
- A Share button that generates a permalink to your code

Paste any code example from this book into the playground and click Run (or press `Cmd+Enter`).

## Your Development Workflow

Here's the loop that makes Apogee productive:

1. **Write** `.apg` code in your editor (VS Code has an extension with syntax highlighting and LSP support)
2. **Check** with `apogee check file.apg` — get instant feedback on type errors
3. **Run** with `apogee run file.apg` — see output immediately
4. **Compile** with `apogee compile file.apg` — when you need to deploy or inspect the Python output

The check step is where Apogee earns its keep. Errors that would be runtime crashes in Python become compile-time errors in Apogee. You fix them before your code ever executes.

## A Taste of What's Coming

Here's a slightly more complex program to whet your appetite. Don't worry if you don't understand every line yet — we'll cover all of it in the following chapters.

```
type Task {
  title: String
  priority: Int where priority >= 1
  done: Int
}

fn pending_tasks(tasks: [Task]) -> [Task] {
  from tasks where it.done == 0
}

fn high_priority(tasks: [Task]) -> [Task] {
  from tasks where it.priority >= 3
}

let tasks = [
  Task { title: "Write compiler", priority: 5, done: 1 },
  Task { title: "Build REPL", priority: 4, done: 1 },
  Task { title: "Write book", priority: 5, done: 0 },
  Task { title: "Add LLVM backend", priority: 3, done: 0 },
  Task { title: "Fix docs typo", priority: 1, done: 0 }
]

let todo = pending_tasks(tasks)
let urgent = high_priority(todo)

print("Pending tasks:")
for t in todo {
  print(t.title)
}

print("Urgent:")
for t in urgent {
  print(t.title)
}
```

```
Pending tasks:
Write book
Add LLVM backend
Fix docs typo
Urgent:
Write book
Add LLVM backend
```

Query expressions (`from ... where ...`), constraint types (`priority >= 1`), type-safe struct literals, and clean iteration — all in 30 lines.

## Common Mistakes

**Forgetting the file extension.** Apogee files must end in `.apg`. Running `apogee run hello.py` will give you an error.

**Using `=` instead of `==` in conditions.** `=` is assignment, `==` is comparison. The compiler will catch this — `if x = 5` is a parse error, not a silent bug.

**Missing the closing `}` on a block.** The compiler will tell you exactly where the opening `{` was and that it expects a closing `}`. Follow the line numbers.

## What You Learned

- How to install Apogee with `pip install apogee-lang`
- The three commands: `run`, `compile`, `check`
- What Apogee code looks like and what it compiles to
- The browser playground at apogee-lang.dev
- The development workflow: write → check → run → compile

## Try It Yourself

1. Install Apogee and create a file that prints your name using string interpolation: `"Hello, \(name)!"`

2. Create a `Temperature` type with a `celsius` field constrained to `>= -273` (absolute zero). Try creating a temperature of `-300` and read the error.

3. Run `apogee compile` on your file and read the Python output. Notice how the constraint becomes runtime validation.
