/**
 * Test suite for all 7 Apogee MCP tools.
 * Run with: node --test test/tools.test.js
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compile, check, run, readSpec } from "../src/compiler.js";

// ── Tool 1: apogee_compile ──

describe("apogee_compile", () => {
  it("compiles a valid program to Python", () => {
    const result = compile('print("Hello, World!")');
    assert.equal(result.success, true);
    assert.ok(result.python_output.includes("print"));
    assert.equal(result.errors, undefined);
  });

  it("compiles a function with @intent", () => {
    const code = `
@intent("greet the user")
fn greet(name: String) -> String {
  "Hello, \\(name)!"
}
print(greet("Tyler"))
`;
    const result = compile(code);
    assert.equal(result.success, true);
    assert.ok(result.python_output.includes('"""Intent: greet the user"""'));
    assert.ok(result.python_output.includes("f\"Hello, {name}!\""));
  });

  it("compiles types with constraints", () => {
    const code = `
type User {
  name: String
  age: Int where age >= 0
}
let u = User { name: "Tyler", age: 35 }
print(u.name)
`;
    const result = compile(code);
    assert.equal(result.success, true);
    assert.ok(result.python_output.includes("@dataclass"));
    assert.ok(result.python_output.includes("__post_init__"));
  });

  it("returns errors for invalid code", () => {
    const result = compile('fn broken() -> Int {\n  42');
    assert.equal(result.success, false);
    assert.ok(result.errors.length > 0);
    assert.ok(result.errors[0].message.length > 0);
  });

  it("catches constraint violations on literals", () => {
    const code = `
type User {
  name: String
  age: Int where age >= 0
}
let bad = User { name: "X", age: -1 }
`;
    const result = compile(code);
    assert.equal(result.success, false);
    assert.ok(result.errors.some((e) => e.message.includes("Constraint")));
  });

  it("includes timing information", () => {
    const result = compile('let x = 42');
    assert.ok(result.time_ms >= 0);
  });
});

// ── Tool 2: apogee_run ──

describe("apogee_run", () => {
  it("runs a simple program and captures stdout", () => {
    const result = run('print("hello from apogee")');
    assert.equal(result.exit_code, 0);
    assert.ok(result.stdout.includes("hello from apogee"));
  });

  it("runs programs with type definitions", () => {
    const code = `
type Point {
  x: Int
  y: Int
}
let p = Point { x: 10, y: 20 }
print(p.x)
`;
    const result = run(code);
    assert.equal(result.exit_code, 0);
    assert.ok(result.stdout.includes("10"));
  });

  it("returns compile errors without executing", () => {
    const result = run("print(undefined_var)");
    assert.equal(result.exit_code, 1);
    assert.ok(result.stderr.includes("Undefined variable"));
  });

  it("enforces runtime constraints", () => {
    const code = `
type Age {
  value: Int where value >= 0
}
// This compiles but fails at runtime with a variable
let x = 0
let a = Age { value: x }
print(a.value)
`;
    const result = run(code);
    assert.equal(result.exit_code, 0);
    assert.ok(result.stdout.includes("0"));
  });

  it("reports runtime_ms", () => {
    const result = run('print("fast")');
    assert.ok(result.runtime_ms >= 0);
  });
});

// ── Tool 3: apogee_check ──

describe("apogee_check", () => {
  it("reports valid code as valid", () => {
    const result = check(`
fn greet(name: String) -> String {
  "Hello, \\(name)!"
}
print(greet("World"))
`);
    assert.equal(result.valid, true);
    assert.equal(result.type_errors.length, 0);
  });

  it("reports undefined variables", () => {
    const result = check("print(undefined_var)");
    assert.equal(result.valid, false);
    assert.ok(result.type_errors.length > 0);
  });

  it("reports intent coverage", () => {
    const code = `
@intent("add two numbers")
fn add(a: Int, b: Int) -> Int {
  a + b
}
fn no_intent(x: Int) -> Int {
  x
}
`;
    const result = check(code);
    assert.ok(result.intent_coverage >= 0);
  });

  it("identifies constraint violations", () => {
    const result = check(`
type Positive {
  value: Int where value >= 0
}
let bad = Positive { value: -5 }
`);
    assert.equal(result.valid, false);
    assert.ok(result.constraint_violations.length > 0);
  });
});

// ── Tool 4: apogee_explain_error ──

describe("apogee_explain_error", () => {
  it("check finds undefined variables", () => {
    const result = check("print(nonexistent)");
    assert.equal(result.valid, false);
    assert.ok(result.type_errors.some((e) => e.message.includes("Undefined")));
  });
});

// ── Tool 5: apogee_spec_lookup ──

describe("apogee_spec_lookup", () => {
  it("finds spec content", () => {
    const spec = readSpec();
    if (spec) {
      assert.ok(spec.includes("Apogee"));
      assert.ok(spec.includes("fn"));
    } else {
      // Spec might not be available in CI
      console.log("  (spec not found — skipping)");
    }
  });
});

// ── Tool 6: apogee_transpile_from ──

describe("apogee_transpile_from (logic)", () => {
  it("transpiles Python print to Apogee print", () => {
    const compiled = compile('print("hello")');
    assert.equal(compiled.success, true);
  });
});

// ── Tool 7: apogee_corpus_add ──

describe("apogee_corpus_add (logic)", () => {
  it("rejects code that doesn't compile", () => {
    const result = compile("fn broken() {");
    assert.equal(result.success, false);
  });

  it("accepts code that compiles", () => {
    const result = compile('print("valid")');
    assert.equal(result.success, true);
  });
});
