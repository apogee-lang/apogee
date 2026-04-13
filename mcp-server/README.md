# Apogee MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that gives AI assistants the ability to compile, run, type-check, and explain Apogee code.

When connected, Claude can compile and execute Apogee programs inline in any conversation — making it the best Apogee IDE, accessible from anywhere.

## Quick Start

```bash
npx apogee-mcp
```

That's it. The server starts on stdio and auto-discovers the Apogee compiler.

**Prerequisites:** Python 3.9+ with Apogee installed (`pip install apogee-lang`).

## Connect to Claude Desktop

Add this to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "apogee": {
      "command": "npx",
      "args": ["apogee-mcp"]
    }
  }
}
```

Restart Claude Desktop. You'll see the Apogee tools available in the tools menu.

## Connect to Claude Code

Add to your Claude Code settings or `.mcp.json`:

```json
{
  "mcpServers": {
    "apogee": {
      "command": "npx",
      "args": ["apogee-mcp"]
    }
  }
}
```

## Tools

### `apogee_compile`

Compile Apogee code to Python.

```
Input:  { code: "print(\"hello\")" }
Output: { success: true, python_output: "...", time_ms: 1.2 }
```

### `apogee_run`

Compile and execute in a sandbox (no filesystem, no network, 5s timeout).

```
Input:  { code: "print(40 + 2)" }
Output: { stdout: "42\n", stderr: "", exit_code: 0, runtime_ms: 85 }
```

### `apogee_check`

Type-check only — reports errors, null safety violations, constraint violations, and `@intent` coverage.

```
Input:  { code: "print(undefined_var)" }
Output: { valid: false, type_errors: [{message: "Undefined variable: 'undefined_var'", ...}] }
```

### `apogee_explain_error`

Explain a compiler error in plain language with a fix example.

```
Input:  { error_message: "Cannot assign null to non-nullable type 'String'", code_context: "..." }
Output: { explanation: "...", fix_example: "...", why_this_matters: "..." }
```

### `apogee_spec_lookup`

Search the Apogee language specification.

```
Input:  { query: "constraint types" }
Output: { relevant_sections: [...], examples: [...] }
```

### `apogee_transpile_from`

Transpile Python/TypeScript/JavaScript to Apogee.

```
Input:  { source_code: "def greet(name): ...", source_language: "python" }
Output: { apogee_code: "fn greet(name: Any) -> Any { ... }", notes: [...] }
```

### `apogee_corpus_add`

Add a verified example to the training corpus. Code must compile successfully.

```
Input:  { apogee_code: "...", description: "Todo list app", category: "cli" }
Output: { accepted: true, corpus_id: "mcp_cli_a1b2c3d4", corpus_size: 42 }
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `APOGEE_PATH` | auto-detect | Path to the Apogee project root |

## Tests

```bash
npm test
# 20/20 passing
```

## License

MIT
