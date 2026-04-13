/**
 * Apogee compiler bridge — invokes the Python compiler as a subprocess.
 * Falls back to finding the compiler on PATH or via APOGEE_PATH env.
 */
import { execSync, execFileSync } from "child_process";
import { writeFileSync, unlinkSync, readFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { randomBytes } from "crypto";

function tmpFile(ext) {
  return join(tmpdir(), `apogee-mcp-${randomBytes(6).toString("hex")}${ext}`);
}

function findPython() {
  for (const cmd of ["python3", "python"]) {
    try {
      execSync(`${cmd} --version`, { stdio: "ignore", timeout: 5000 });
      return cmd;
    } catch {
      // try next
    }
  }
  throw new Error("Python not found. Install Python 3.9+ to use the Apogee MCP server.");
}

const PYTHON = findPython();

// Path to the Apogee compiler package
function findCompilerPath() {
  // Check APOGEE_PATH env
  if (process.env.APOGEE_PATH) return process.env.APOGEE_PATH;

  // Check if apogee is importable as a Python module
  try {
    const result = execSync(
      `${PYTHON} -c "import src.cli; print('ok')"`,
      { encoding: "utf-8", timeout: 5000, cwd: join(new URL("../..", import.meta.url).pathname) }
    );
    if (result.trim() === "ok") {
      return join(new URL("../..", import.meta.url).pathname);
    }
  } catch {
    // not found relative
  }

  // Check if apogee CLI is on PATH
  try {
    execSync("apogee --help", { stdio: "ignore", timeout: 5000 });
    return "system";
  } catch {
    // not found
  }

  return null;
}

const COMPILER_PATH = findCompilerPath();

/**
 * Run the Apogee compiler inline via Python subprocess.
 */
function runCompilerScript(code, mode = "compile") {
  const script = `
import sys, json, time
sys.path.insert(0, ${JSON.stringify(COMPILER_PATH === "system" ? "." : COMPILER_PATH)})

try:
    from src.lexer import tokenize, LexError
    from src.parser import parse, ParseError
    from src.typechecker import typecheck, TypeError_
    from src.emitter import emit_python
except ImportError:
    # Try as installed package
    try:
        from apogee.lexer import tokenize, LexError
        from apogee.parser import parse, ParseError
        from apogee.typechecker import typecheck, TypeError_
        from apogee.emitter import emit_python
    except ImportError:
        print(json.dumps({"error": "Apogee compiler not found. Install with: pip install apogee-lang"}))
        sys.exit(0)

code = ${JSON.stringify(code)}
result = {"errors": [], "warnings": [], "python": "", "valid": True}

start = time.time()
try:
    tokens = tokenize(code, "<mcp>")
    program = parse(tokens, "<mcp>")
    type_errors = typecheck(program)

    if type_errors:
        result["valid"] = False
        for e in type_errors:
            result["errors"].append({
                "message": e.msg,
                "line": e.line,
                "col": e.col,
                "fix_suggestion": getattr(e, "suggestion", ""),
                "phase": "type"
            })

    if ${mode === "compile" || mode === "run" ? "True" : "False"} and not type_errors:
        python_code = emit_python(program)
        result["python"] = python_code

except LexError as e:
    result["valid"] = False
    result["errors"].append({
        "message": e.msg,
        "line": e.line,
        "col": e.col,
        "fix_suggestion": "",
        "phase": "lex"
    })
except ParseError as e:
    result["valid"] = False
    result["errors"].append({
        "message": e.msg,
        "line": e.line,
        "col": e.col,
        "fix_suggestion": getattr(e, "suggestion", ""),
        "phase": "parse"
    })
except Exception as e:
    result["valid"] = False
    result["errors"].append({
        "message": str(e),
        "line": 0,
        "col": 0,
        "fix_suggestion": "",
        "phase": "internal"
    })

result["time_ms"] = round((time.time() - start) * 1000, 2)

# Intent coverage
try:
    fn_count = code.count("\\nfn ") + (1 if code.startswith("fn ") else 0)
    intent_count = code.count("@intent")
    result["intent_coverage"] = round(intent_count / max(fn_count, 1) * 100)
except:
    result["intent_coverage"] = 0

# Null safety violations count
null_violations = [e for e in result["errors"] if "null" in e["message"].lower() or "nullable" in e["message"].lower()]
result["null_safety_violations"] = null_violations

# Constraint violations count
constraint_violations = [e for e in result["errors"] if "constraint" in e["message"].lower()]
result["constraint_violations"] = constraint_violations

print(json.dumps(result))
`;

  const scriptFile = tmpFile(".py");
  try {
    writeFileSync(scriptFile, script);
    const output = execSync(`${PYTHON} "${scriptFile}"`, {
      encoding: "utf-8",
      timeout: 10000,
      maxBuffer: 1024 * 1024,
    });
    return JSON.parse(output.trim());
  } catch (err) {
    if (err.stdout) {
      try { return JSON.parse(err.stdout.trim()); } catch { /* fall through */ }
    }
    return {
      errors: [{ message: err.message || "Compiler execution failed", line: 0, col: 0, fix_suggestion: "", phase: "internal" }],
      warnings: [],
      python: "",
      valid: false,
      time_ms: 0,
      intent_coverage: 0,
      null_safety_violations: [],
      constraint_violations: [],
    };
  } finally {
    try { unlinkSync(scriptFile); } catch { /* ignore */ }
  }
}

/**
 * Compile Apogee code to Python.
 */
export function compile(code, filename) {
  const result = runCompilerScript(code, "compile");
  return {
    success: result.valid && result.errors.length === 0,
    python_output: result.python || undefined,
    errors: result.errors.length ? result.errors : undefined,
    warnings: result.warnings?.length ? result.warnings : undefined,
    time_ms: result.time_ms,
  };
}

/**
 * Type-check Apogee code without compilation.
 */
export function check(code) {
  const result = runCompilerScript(code, "check");
  return {
    valid: result.valid && result.errors.length === 0,
    type_errors: result.errors.filter(e => e.phase === "type"),
    null_safety_violations: result.null_safety_violations || [],
    constraint_violations: result.constraint_violations || [],
    intent_coverage: result.intent_coverage || 0,
  };
}

/**
 * Compile and run Apogee code in a sandboxed Python subprocess.
 */
export function run(code, stdin) {
  // First compile
  const compiled = compile(code);
  if (!compiled.success) {
    return {
      stdout: "",
      stderr: compiled.errors?.map(e => `[${e.line}:${e.col}] ${e.message}`).join("\n") || "Compilation failed",
      exit_code: 1,
      runtime_ms: 0,
    };
  }

  // Run the compiled Python in a sandbox
  const pyFile = tmpFile(".py");
  const startTime = Date.now();
  try {
    writeFileSync(pyFile, compiled.python_output);

    // Sandbox: no network, limited imports, 5s timeout
    const sandboxWrapper = `
import sys, io, time
sys.stdin = io.StringIO(${JSON.stringify(stdin || "")})

# Restrict dangerous modules — allow stdlib internals needed by dataclasses
_blocked = {'subprocess', 'shutil', 'socket', 'http', 'urllib', 'requests', 'pathlib', 'webbrowser', 'smtplib', 'ftplib', 'xmlrpc'}
_original_import = __builtins__.__import__
def _safe_import(name, *args, **kwargs):
    top = name.split('.')[0]
    if top in _blocked:
        raise ImportError(f"Module '{name}' is not available in sandbox mode")
    return _original_import(name, *args, **kwargs)
__builtins__.__import__ = _safe_import

exec(open(${JSON.stringify(pyFile)}).read())
`;
    const wrapperFile = tmpFile("_runner.py");
    writeFileSync(wrapperFile, sandboxWrapper);

    try {
      const result = execSync(`${PYTHON} "${wrapperFile}"`, {
        encoding: "utf-8",
        timeout: 5000,
        maxBuffer: 512 * 1024,
      });
      const runtimeMs = Date.now() - startTime;
      return { stdout: result, stderr: "", exit_code: 0, runtime_ms: runtimeMs };
    } catch (execErr) {
      const runtimeMs = Date.now() - startTime;
      return {
        stdout: execErr.stdout || "",
        stderr: execErr.stderr || execErr.message || "Execution failed",
        exit_code: execErr.status || 1,
        runtime_ms: runtimeMs,
      };
    } finally {
      try { unlinkSync(wrapperFile); } catch { /* ignore */ }
    }
  } finally {
    try { unlinkSync(pyFile); } catch { /* ignore */ }
  }
}

/**
 * Read the language spec for semantic search.
 */
export function readSpec() {
  const specPath = join(new URL("../..", import.meta.url).pathname, "spec", "SPEC.md");
  if (existsSync(specPath)) {
    return readFileSync(specPath, "utf-8");
  }
  return null;
}
