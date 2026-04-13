"""Test runner for Apogee .apg test programs."""

from __future__ import annotations
import os
import sys
import subprocess
import tempfile

# Add parent dir to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.lexer import tokenize, LexError
from src.parser import parse, ParseError
from src.typechecker import typecheck, TypeError_
from src.emitter import emit_python

TESTS_DIR = os.path.dirname(os.path.abspath(__file__))
PASS = 0
FAIL = 0


def run_test(name: str, source: str, expect_error: bool = False,
             expected_output: str | None = None,
             expected_error_substr: str | None = None):
    global PASS, FAIL
    label = f"  {name}"

    try:
        tokens = tokenize(source, name)
        program = parse(tokens, name)
        errors = typecheck(program)

        if expect_error:
            if errors:
                if expected_error_substr:
                    found = any(expected_error_substr in str(e) for e in errors)
                    if found:
                        print(f"\033[32m✓\033[0m {label} (expected error caught)")
                        PASS += 1
                        return
                    else:
                        print(f"\033[31m✗\033[0m {label} — error found but wrong message")
                        for e in errors:
                            print(f"    Got: {e}")
                        FAIL += 1
                        return
                print(f"\033[32m✓\033[0m {label} (expected error caught)")
                PASS += 1
                return
            else:
                print(f"\033[31m✗\033[0m {label} — expected type error but none found")
                FAIL += 1
                return

        if errors:
            print(f"\033[31m✗\033[0m {label} — unexpected type errors:")
            for e in errors:
                print(f"    {e}")
            FAIL += 1
            return

        code = emit_python(program)

        if expected_output is not None:
            with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
                f.write(code)
                tmp = f.name
            try:
                result = subprocess.run(
                    [sys.executable, tmp],
                    capture_output=True, text=True, timeout=10
                )
                actual = result.stdout.strip()
                if actual == expected_output.strip():
                    print(f"\033[32m✓\033[0m {label}")
                    PASS += 1
                else:
                    print(f"\033[31m✗\033[0m {label} — output mismatch")
                    print(f"    Expected: {expected_output.strip()!r}")
                    print(f"    Got:      {actual!r}")
                    if result.stderr:
                        print(f"    Stderr:   {result.stderr.strip()}")
                    FAIL += 1
            finally:
                os.unlink(tmp)
        else:
            # Just check it compiles and produces valid Python
            with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
                f.write(code)
                tmp = f.name
            try:
                result = subprocess.run(
                    [sys.executable, "-c", f"import ast; ast.parse(open('{tmp}').read())"],
                    capture_output=True, text=True, timeout=5
                )
                if result.returncode == 0:
                    print(f"\033[32m✓\033[0m {label} (compiles to valid Python)")
                    PASS += 1
                else:
                    print(f"\033[31m✗\033[0m {label} — invalid Python output")
                    print(f"    {result.stderr.strip()}")
                    FAIL += 1
            finally:
                os.unlink(tmp)

    except (LexError, ParseError) as e:
        if expect_error:
            if expected_error_substr and expected_error_substr in str(e):
                print(f"\033[32m✓\033[0m {label} (expected error caught)")
                PASS += 1
            elif expect_error:
                print(f"\033[32m✓\033[0m {label} (expected error caught)")
                PASS += 1
            else:
                print(f"\033[31m✗\033[0m {label} — wrong error: {e}")
                FAIL += 1
        else:
            print(f"\033[31m✗\033[0m {label} — unexpected error: {e}")
            FAIL += 1


def main():
    global PASS, FAIL
    print("\n\033[1mApogee Test Suite\033[0m\n")

    # --- 1. Hello World ---
    run_test("01_hello_world", '''
print("Hello, World!")
''', expected_output="Hello, World!")

    # --- 2. Variables and types ---
    run_test("02_variables", '''
let x = 42
let name = "Apogee"
print(x)
print(name)
''', expected_output="42\nApogee")

    # --- 3. Function declaration ---
    run_test("03_function", '''
fn add(a: Int, b: Int) -> Int {
  a + b
}
print(add(3, 4))
''', expected_output="7")

    # --- 4. Type definition and struct literal ---
    run_test("04_type_def", '''
type Point {
  x: Int
  y: Int
}
let p = Point { x: 10, y: 20 }
print(p.x)
print(p.y)
''', expected_output="10\n20")

    # --- 5. String interpolation ---
    run_test("05_interpolation", '''
let name = "Tyler"
print("Hello, \\(name)!")
''', expected_output="Hello, Tyler!")

    # --- 6. Query expression ---
    run_test("06_query", '''
let nums = [1, 2, 3, 4, 5, 6, 7, 8]
let evens = from nums where it % 2 == 0
print(evens)
''', expected_output="[2, 4, 6, 8]")

    # --- 7. If expression ---
    run_test("07_if_expr", '''
let x = 10
if x > 5 {
  print("big")
} else {
  print("small")
}
''', expected_output="big")

    # --- 8. For loop ---
    run_test("08_for_loop", '''
for i in [1, 2, 3] {
  print(i)
}
''', expected_output="1\n2\n3")

    # --- 9. Intent annotation ---
    run_test("09_intent", '''
@intent("greet the user by name, never null")
fn greet(name: String) -> String {
  "Hello, \\(name)! Welcome to Apogee."
}
print(greet("Tyler"))
''', expected_output="Hello, Tyler! Welcome to Apogee.")

    # --- 10. Full showcase (the required program) ---
    run_test("10_showcase", '''
@intent("greet the user by name, never null")
fn greet(name: String) -> String {
  "Hello, \\(name)! Welcome to Apogee."
}

type User {
  name: String
  age: Int where age >= 0
}

let user = User { name: "Tyler", age: 35 }
print(greet(user.name))
''', expected_output="Hello, Tyler! Welcome to Apogee.")

    # --- 11. Nested function calls ---
    run_test("11_nested_calls", '''
fn double(n: Int) -> Int {
  n * 2
}
fn add_one(n: Int) -> Int {
  n + 1
}
print(add_one(double(5)))
''', expected_output="11")

    # --- 12. List operations ---
    run_test("12_list_ops", '''
let items = [10, 20, 30]
print(items[0])
print(len(items))
''', expected_output="10\n3")

    # --- 13. Boolean logic ---
    run_test("13_boolean", '''
let a = true
let b = false
if a && !b {
  print("yes")
}
''', expected_output="yes")

    # --- 14. Multi-word function names ---
    run_test("14_backtick_name", '''
fn `add numbers`(a: Int, b: Int) -> Int {
  a + b
}
print(`add numbers`(2, 3))
''', expected_output="5")

    # --- 15. While loop ---
    run_test("15_while_loop", '''
let count = 0
while count < 3 {
  print(count)
  count = count + 1
}
''', expected_output="0\n1\n2")

    # --- ERROR TESTS (16-20) ---

    # --- 16. Constraint violation: negative age ---
    run_test("16_err_constraint", '''
type User {
  name: String
  age: Int where age >= 0
}
let bad = User { name: "X", age: -1 }
''', expect_error=True, expected_error_substr="Constraint violation")

    # --- 17. Undefined variable ---
    run_test("17_err_undefined", '''
print(undefined_var)
''', expect_error=True, expected_error_substr="Undefined variable")

    # --- 18. Missing struct field ---
    run_test("18_err_missing_field", '''
type Point {
  x: Int
  y: Int
}
let p = Point { x: 10 }
''', expect_error=True, expected_error_substr="Missing fields")

    # --- 19. Unknown field in struct ---
    run_test("19_err_unknown_field", '''
type Color {
  r: Int
  g: Int
  b: Int
}
let c = Color { r: 255, g: 0, b: 0, alpha: 128 }
''', expect_error=True, expected_error_substr="Unknown field")

    # --- 20. Parse error: missing brace ---
    run_test("20_err_parse", '''
fn broken() -> Int {
  42
''', expect_error=True, expected_error_substr="Expected '}'")

    # --- Summary ---
    total = PASS + FAIL
    print(f"\n\033[1mResults: {PASS}/{total} passed\033[0m")
    if FAIL > 0:
        print(f"\033[31m{FAIL} test(s) failed\033[0m")
        sys.exit(1)
    else:
        print("\033[32mAll tests passed!\033[0m")


if __name__ == "__main__":
    main()
