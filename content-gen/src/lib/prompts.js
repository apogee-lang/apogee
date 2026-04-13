/**
 * System prompts and templates for content generation.
 */

export const APOGEE_CONTEXT = `You are writing content about Apogee, a statically-typed programming language that compiles to Python 3.11+.

Key Apogee features:
- Null safety: String (never null) vs String? (nullable). Compiler enforces.
- Constraint types: Int where value >= 0 — validated at compile time for literals, runtime for variables.
- @intent annotations: @intent("description") before functions — machine-readable contracts.
- Structured concurrency: spawn { task1(); task2() } — all tasks complete before continuing.
- Query expressions: from list where it.field == value — type-safe filtering.
- String interpolation: "Hello, \\(name)!"
- Type definitions: type Name { field: Type }
- Functions: fn name(param: Type) -> ReturnType { body } — last expression is return value.
- Multi-word identifiers: \`add numbers\`(a, b)
- Comments: // line, /* block */

Apogee syntax:
- fn, type, let, if/else, for/in, while, match, from/where, spawn, return, import
- true, false, null
- -> (return type), => (match arm), ? (nullable suffix/safe access)
- No semicolons needed

CLI: apogee compile file.apg, apogee run file.apg, apogee check file.apg
Playground: https://apogee-lang.dev
GitHub: https://github.com/apogee-lang/apogee`;

export const COMPARISON_SYSTEM = `${APOGEE_CONTEXT}

You are generating a technical blog post comparing a Python project to Apogee. Write in a conversational, developer-friendly tone. Be honest about limitations. Never be condescending. Show real code and real benefits.

The post should be compelling enough for Hacker News — technically rigorous, not marketing fluff.`;

export const TUTORIAL_SYSTEM = `${APOGEE_CONTEXT}

You are writing a technical tutorial for experienced developers. Assume they know Python or JavaScript. Be conversational, smart, and concise. Every code example must be complete and runnable. Include 10+ code examples. 1500-2500 words.

Never be condescending. Write like a knowledgeable friend teaching, not a spec document.`;

export const DEVLOG_SYSTEM = `${APOGEE_CONTEXT}

You are writing a weekly devlog for the Apogee project. Tone: honest, technical, behind-the-scenes. Share decisions made, problems encountered, and what's next. Developers love transparency about the build process.

Format: newsletter-ready markdown with headers, code snippets where relevant, and a "Next Week" section.`;

export const HN_SYSTEM = `${APOGEE_CONTEXT}

You are writing a Show HN post. Hacker News values:
- Technical depth over marketing
- Honesty about limitations
- Concrete examples
- No buzzwords or hype
- Brief, dense, scannable

The post should make a Hacker News reader think "this is interesting, I should try it."`;

export const CORPUS_SYSTEM = `${APOGEE_CONTEXT}

You are generating realistic Apogee code examples for a training corpus. Each example must:
1. Be a complete, runnable program
2. Use at least 3 Apogee features (types, @intent, constraints, queries, spawn, etc.)
3. Represent a realistic use case
4. Include comments explaining key concepts
5. Be 20-60 lines

Generate ONLY the Apogee code. No prose. No markdown fences. Just .apg source code.`;

export const TUTORIAL_TOPICS = [
  {
    slug: "rest-api",
    title: "Building a REST API in Apogee",
    prompt: "Write a tutorial on building a REST API in Apogee. Cover type definitions for request/response, @intent annotations for handlers, constraint types for validation, and how the compiled Python can be served with FastAPI or Flask.",
  },
  {
    slug: "null-safety",
    title: "Null Safety: A Practical Guide",
    prompt: "Write a tutorial on null safety in Apogee. Cover String vs String?, the ? operator, why null is dangerous, compile-time vs runtime checks, and practical patterns for handling nullable values.",
  },
  {
    slug: "apogee-and-claude",
    title: "Apogee + Claude: The Perfect AI Coding Stack",
    prompt: "Write a tutorial on using Claude to write Apogee code. Include the system prompt, examples of prompting for Apogee, the edit-compile-fix loop, and how @intent annotations help AI understand code.",
  },
  {
    slug: "python-migration",
    title: "Migrating from Python to Apogee: A Week's Experience",
    prompt: "Write a first-person tutorial about migrating a Python project to Apogee. Cover what translates directly, what needs rethinking (null handling, validation), and the benefits discovered along the way.",
  },
  {
    slug: "structured-concurrency",
    title: "Structured Concurrency in Apogee vs async/await in Python",
    prompt: "Write a tutorial comparing Apogee's spawn blocks to Python's asyncio. Cover the problems with unstructured concurrency, how spawn solves them, and real examples of parallel API calls and data processing.",
  },
  {
    slug: "constraint-types",
    title: "Type Constraints: The Feature You Didn't Know You Needed",
    prompt: "Write a tutorial on Apogee's constraint types. Cover Int where value >= 0, compile-time vs runtime validation, domain modeling, and why this is better than manual validation scattered across your codebase.",
  },
  {
    slug: "data-pipeline",
    title: "Building a Data Pipeline in Apogee",
    prompt: "Write a tutorial on building data pipelines with Apogee's from/where query syntax. Cover filtering, chaining queries, type-safe data access, and a complete example processing sales/analytics data.",
  },
];

export const CORPUS_CATEGORIES = [
  { name: "web", prompt: "Generate an Apogee program that implements a simple web API handler with typed request/response types, @intent annotations, and constraint validation on input fields." },
  { name: "cli", prompt: "Generate an Apogee program that implements a CLI tool with argument parsing, file operations, and formatted output. Use types for configuration and @intent for command handlers." },
  { name: "data", prompt: "Generate an Apogee program that processes structured data — define types, load records, use from/where queries to filter and transform, and output results." },
  { name: "algorithm", prompt: "Generate an Apogee program that implements a common algorithm (sorting, searching, graph traversal, etc.) with typed inputs, constraint types, and clear @intent annotations." },
  { name: "game", prompt: "Generate an Apogee program that implements a simple text-based game or simulation — character types with constraints, game state management, and query-based logic." },
];
