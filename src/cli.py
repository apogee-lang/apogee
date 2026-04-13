"""Apogee CLI — compile, run, and check .apg files."""

from __future__ import annotations
import sys
import os
import subprocess
import argparse

# Color codes
RED = "\033[31m"
YELLOW = "\033[33m"
GREEN = "\033[32m"
CYAN = "\033[36m"
BOLD = "\033[1m"
RESET = "\033[0m"


def color(text: str, code: str) -> str:
    if not sys.stdout.isatty():
        return text
    return f"{code}{text}{RESET}"


def print_error(msg: str, suggestion: str = ""):
    print(color("error", RED + BOLD) + ": " + msg, file=sys.stderr)
    if suggestion:
        print(color("  suggestion", CYAN) + ": " + suggestion, file=sys.stderr)


def print_success(msg: str):
    print(color("✓", GREEN) + " " + msg)


def read_source(path: str) -> str:
    if not os.path.exists(path):
        print_error(f"File not found: {path}")
        sys.exit(1)
    if not path.endswith(".apg"):
        print_error(f"Expected .apg file, got: {path}", "Apogee files use the .apg extension")
        sys.exit(1)
    with open(path, "r") as f:
        return f.read()


def compile_source(source: str, filename: str = "<stdin>") -> tuple[str | None, list]:
    """Compile Apogee source to Python. Returns (python_code, errors)."""
    from .lexer import tokenize, LexError
    from .parser import parse, ParseError
    from .typechecker import typecheck, TypeError_
    from .emitter import emit_python

    try:
        tokens = tokenize(source, filename)
    except LexError as e:
        return None, [e]

    try:
        program = parse(tokens, filename)
    except ParseError as e:
        return None, [e]

    type_errors = typecheck(program)
    if type_errors:
        return None, type_errors

    python_code = emit_python(program)
    return python_code, []


def cmd_compile(args):
    source = read_source(args.file)
    code, errors = compile_source(source, args.file)
    if errors:
        for e in errors:
            print_error(str(e))
        sys.exit(1)

    out_path = args.output or args.file.replace(".apg", ".py")
    with open(out_path, "w") as f:
        f.write(code)
    print_success(f"Compiled {args.file} → {out_path}")


def cmd_run(args):
    source = read_source(args.file)
    code, errors = compile_source(source, args.file)
    if errors:
        for e in errors:
            print_error(str(e))
        sys.exit(1)

    # Write to temp file and run
    import tempfile
    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
        f.write(code)
        tmp = f.name

    try:
        result = subprocess.run([sys.executable, tmp], capture_output=False)
        sys.exit(result.returncode)
    finally:
        os.unlink(tmp)


def cmd_check(args):
    source = read_source(args.file)
    from .lexer import tokenize, LexError
    from .parser import parse, ParseError
    from .typechecker import typecheck

    try:
        tokens = tokenize(source, args.file)
    except LexError as e:
        print_error(str(e))
        sys.exit(1)

    try:
        program = parse(tokens, args.file)
    except ParseError as e:
        print_error(str(e))
        sys.exit(1)

    type_errors = typecheck(program)
    if type_errors:
        for e in type_errors:
            print_error(e.msg, getattr(e, "suggestion", ""))
        sys.exit(1)

    print_success(f"No type errors in {args.file}")


def main():
    parser = argparse.ArgumentParser(
        prog="apogee",
        description="Apogee — a programming language for the AI era"
    )
    sub = parser.add_subparsers(dest="command")

    # compile
    p_compile = sub.add_parser("compile", help="Compile .apg to .py")
    p_compile.add_argument("file", help="Input .apg file")
    p_compile.add_argument("-o", "--output", help="Output file path")
    p_compile.set_defaults(func=cmd_compile)

    # run
    p_run = sub.add_parser("run", help="Compile and run .apg file")
    p_run.add_argument("file", help="Input .apg file")
    p_run.set_defaults(func=cmd_run)

    # check
    p_check = sub.add_parser("check", help="Type-check .apg file (no output)")
    p_check.add_argument("file", help="Input .apg file")
    p_check.set_defaults(func=cmd_check)

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(1)

    args.func(args)


if __name__ == "__main__":
    main()
