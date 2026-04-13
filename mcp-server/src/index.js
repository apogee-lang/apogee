#!/usr/bin/env node

/**
 * Apogee MCP Server — exposes Apogee compiler tools to AI assistants.
 *
 * Tools: apogee_compile, apogee_run, apogee_check, apogee_explain_error,
 *        apogee_spec_lookup, apogee_transpile_from, apogee_corpus_add
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { compile, check, run, readSpec } from "./compiler.js";
import { existsSync, writeFileSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";
import { randomBytes } from "crypto";

const server = new McpServer({
  name: "apogee",
  version: "0.1.0",
});

// ── Tool 1: apogee_compile ──

server.tool(
  "apogee_compile",
  "Compile Apogee (.apg) code to Python. Returns the compiled Python output or compile errors with fix suggestions.",
  {
    code: z.string().describe("Apogee source code to compile"),
    filename: z.string().optional().describe("Optional filename for error messages"),
  },
  async ({ code, filename }) => {
    const result = compile(code, filename);
    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2),
      }],
    };
  }
);

// ── Tool 2: apogee_run ──

server.tool(
  "apogee_run",
  "Compile and execute an Apogee program in a sandboxed environment. No file system or network access. 5-second timeout.",
  {
    code: z.string().describe("Apogee source code to compile and run"),
    stdin: z.string().optional().describe("Optional stdin input for the program"),
  },
  async ({ code, stdin }) => {
    const result = run(code, stdin);
    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2),
      }],
    };
  }
);

// ── Tool 3: apogee_check ──

server.tool(
  "apogee_check",
  "Type-check Apogee code without executing it. Reports type errors, null safety violations, constraint violations, and @intent annotation coverage.",
  {
    code: z.string().describe("Apogee source code to type-check"),
  },
  async ({ code }) => {
    const result = check(code);
    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2),
      }],
    };
  }
);

// ── Tool 4: apogee_explain_error ──

server.tool(
  "apogee_explain_error",
  "Explain an Apogee compiler error in plain language. Provides a clear explanation, a fix example, and why this error matters.",
  {
    error_message: z.string().describe("The compiler error message"),
    code_context: z.string().describe("The code that produced the error"),
  },
  async ({ error_message, code_context }) => {
    const explanations = getErrorExplanation(error_message, code_context);
    return {
      content: [{
        type: "text",
        text: JSON.stringify(explanations, null, 2),
      }],
    };
  }
);

// ── Tool 5: apogee_spec_lookup ──

server.tool(
  "apogee_spec_lookup",
  "Search the Apogee language specification for information about syntax, types, features, or semantics.",
  {
    query: z.string().describe("What to look up — e.g., 'nullable types', 'spawn blocks', 'constraint syntax'"),
  },
  async ({ query }) => {
    const result = specLookup(query);
    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2),
      }],
    };
  }
);

// ── Tool 6: apogee_transpile_from ──

server.tool(
  "apogee_transpile_from",
  "Transpile code from Python, TypeScript, or JavaScript to Apogee. Returns the Apogee equivalent with notes about the translation.",
  {
    source_code: z.string().describe("Source code to transpile to Apogee"),
    source_language: z.enum(["python", "typescript", "javascript"]).describe("Source language"),
  },
  async ({ source_code, source_language }) => {
    const result = transpileFrom(source_code, source_language);
    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2),
      }],
    };
  }
);

// ── Tool 7: apogee_corpus_add ──

server.tool(
  "apogee_corpus_add",
  "Add a verified Apogee code example to the public training corpus. The code must compile successfully before it's accepted.",
  {
    apogee_code: z.string().describe("Apogee source code to add to the corpus"),
    description: z.string().describe("Brief description of what the code does"),
    category: z.enum(["web", "cli", "data", "algorithm", "game", "utility"]).describe("Category for the example"),
  },
  async ({ apogee_code, description, category }) => {
    const result = corpusAdd(apogee_code, description, category);
    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2),
      }],
    };
  }
);

// ── Tool Implementations ──

function getErrorExplanation(errorMessage, codeContext) {
  const lower = errorMessage.toLowerCase();

  // Null safety
  if (lower.includes("null") || lower.includes("nullable")) {
    return {
      explanation: `This error means you're trying to use a value that might be null without handling the null case. In Apogee, types without '?' are guaranteed non-null. The compiler caught a situation where null could sneak in.`,
      fix_example: `// If the type is String?, use null-safe access:\nlet result = value?.length\n\n// Or check for null:\nif value != null {\n  print(value)\n}`,
      why_this_matters: "Null pointer exceptions are the #1 runtime error in most languages. Apogee catches them at compile time, before your code ever runs.",
    };
  }

  // Constraint violation
  if (lower.includes("constraint")) {
    return {
      explanation: `This error means a value violates a type constraint. The type has a 'where' clause that restricts valid values, and the value you provided doesn't satisfy it.`,
      fix_example: `// If the constraint is: Int where value >= 0\n// Then you can't assign -1:\nlet valid = MyType { field: 42 }   // OK\n// let bad = MyType { field: -1 }  // ERROR`,
      why_this_matters: "Constraint types catch invalid data at compile time for literals, and at construction time for runtime values. No manual validation needed.",
    };
  }

  // Missing field
  if (lower.includes("missing field")) {
    return {
      explanation: `You're creating a struct but forgot to provide a required field. All fields without default values must be specified.`,
      fix_example: `// If type User { name: String, age: Int }:\nlet u = User { name: "Tyler", age: 35 }  // provide ALL fields`,
      why_this_matters: "Forgetting a required field is a common bug. The compiler catches it so you don't discover it at runtime.",
    };
  }

  // Undefined variable
  if (lower.includes("undefined variable")) {
    return {
      explanation: `You're using a variable that hasn't been declared with 'let' or as a function parameter. Check for typos.`,
      fix_example: `let myVar = 42\nprint(myVar)  // make sure the name matches exactly`,
      why_this_matters: "Typos in variable names are silent bugs in dynamic languages. Apogee catches them at compile time.",
    };
  }

  // Parse error
  if (lower.includes("parse") || lower.includes("expected")) {
    return {
      explanation: `This is a syntax error — the compiler couldn't understand the structure of your code. Common causes: missing braces {}, parentheses (), or typos in keywords.`,
      fix_example: `// Make sure blocks are properly closed:\nfn example() -> Int {\n  42\n}  // don't forget this closing brace`,
      why_this_matters: "Parse errors point to the exact location where the syntax breaks. Follow the line and column numbers in the error.",
    };
  }

  // Generic
  return {
    explanation: `The compiler found an issue with your code: ${errorMessage}. Check the line and column numbers in the error for the exact location.`,
    fix_example: `// Review the code at the indicated line:\n${codeContext.split("\n").slice(0, 5).join("\n")}`,
    why_this_matters: "Apogee's compiler catches errors that would be runtime crashes in Python. Fix them now to avoid production bugs.",
  };
}

function specLookup(query) {
  const spec = readSpec();
  if (!spec) {
    return {
      relevant_sections: [],
      examples: [],
      note: "Spec file not found. Install Apogee from source to access the spec.",
    };
  }

  const lowerQuery = query.toLowerCase();
  const sections = spec.split(/^## /m).slice(1);
  const results = [];

  for (const section of sections) {
    const title = section.split("\n")[0].trim();
    const body = section;
    const lowerBody = body.toLowerCase();

    // Score relevance by keyword matching
    const queryWords = lowerQuery.split(/\s+/);
    const matches = queryWords.filter((w) => lowerBody.includes(w)).length;

    if (matches > 0) {
      results.push({ title, content: body.trim().slice(0, 1500), relevance: matches / queryWords.length });
    }
  }

  results.sort((a, b) => b.relevance - a.relevance);
  const top = results.slice(0, 3);

  // Extract code examples
  const examples = [];
  for (const s of top) {
    const codeBlocks = s.content.match(/```(?:apogee)?\n([\s\S]*?)```/g) || [];
    for (const block of codeBlocks.slice(0, 2)) {
      examples.push(block.replace(/```(?:apogee)?\n?/g, "").trim());
    }
  }

  return {
    relevant_sections: top.map((s) => ({ title: s.title, content: s.content })),
    examples: examples.slice(0, 5),
  };
}

function transpileFrom(sourceCode, sourceLanguage) {
  // Pattern-based transpilation hints
  const notes = [];
  const unsupported = [];
  let apogeeCode = "";

  // Basic structural patterns
  const lines = sourceCode.split("\n");
  const outputLines = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Comments
    if (trimmed.startsWith("#") && sourceLanguage === "python") {
      outputLines.push(trimmed.replace(/^#/, "//"));
      continue;
    }
    if (trimmed.startsWith("//")) {
      outputLines.push(trimmed);
      continue;
    }

    // Python class → Apogee type
    const classMatch = trimmed.match(/^class\s+(\w+)(?:\(.*\))?:\s*$/);
    if (classMatch) {
      outputLines.push(`type ${classMatch[1]} {`);
      notes.push(`Converted class '${classMatch[1]}' to Apogee type definition`);
      continue;
    }

    // Python def → Apogee fn
    const defMatch = trimmed.match(/^(?:async\s+)?def\s+(\w+)\(([^)]*)\)(?:\s*->\s*(\w+))?\s*:/);
    if (defMatch) {
      const isAsync = trimmed.startsWith("async");
      const name = defMatch[1];
      const params = defMatch[2];
      const ret = defMatch[3] || "Any";

      // Convert params
      const apgParams = params.split(",").map((p) => {
        const parts = p.trim().split(":");
        const pName = parts[0]?.trim().replace(/^self,?\s*/, "") || "";
        if (!pName || pName === "self") return "";
        const pType = parts[1]?.trim() || "Any";
        const typeMap = { str: "String", int: "Int", float: "Float", bool: "Bool", list: "[Any]" };
        return `${pName}: ${typeMap[pType] || pType}`;
      }).filter(Boolean).join(", ");

      const typeMap = { str: "String", int: "Int", float: "Float", bool: "Bool", None: "Void" };
      const retType = typeMap[ret] || ret;

      outputLines.push(`${isAsync ? "async " : ""}fn ${name}(${apgParams}) -> ${retType} {`);
      notes.push(`Converted function '${name}' — add @intent annotation and verify parameter types`);
      continue;
    }

    // Python variable assignment
    const assignMatch = trimmed.match(/^(\w+)\s*(?::\s*\w+)?\s*=\s*(.+)$/);
    if (assignMatch && !trimmed.includes("def ") && !trimmed.includes("class ")) {
      outputLines.push(`let ${assignMatch[1]} = ${assignMatch[2]}`);
      continue;
    }

    // Python f-string → Apogee interpolation
    let converted = trimmed.replace(/f"([^"]*)"/g, (_, content) => {
      return '"' + content.replace(/\{(\w+)\}/g, "\\($1)") + '"';
    });

    // Python True/False/None
    converted = converted.replace(/\bTrue\b/g, "true").replace(/\bFalse\b/g, "false").replace(/\bNone\b/g, "null");

    // Python print
    converted = converted.replace(/^print\(/, "print(");

    // If/elif/else
    converted = converted.replace(/^if\s+(.+):$/, "if $1 {");
    converted = converted.replace(/^elif\s+(.+):$/, "} else if $1 {");
    converted = converted.replace(/^else:$/, "} else {");

    // For loop
    converted = converted.replace(/^for\s+(\w+)\s+in\s+(.+):$/, "for $1 in $2 {");

    // Return
    converted = converted.replace(/^return\s+/, "return ");

    // List comprehension → from/where
    const listCompMatch = converted.match(/\[(\w+)\s+for\s+\w+\s+in\s+(\w+)\s+if\s+(.+)\]/);
    if (listCompMatch) {
      converted = `from ${listCompMatch[2]} where ${listCompMatch[3]}`;
      notes.push("Converted list comprehension to Apogee from/where query");
    }

    outputLines.push(converted);
  }

  // Track unsupported features
  if (sourceCode.includes("import ") && sourceLanguage === "python") {
    unsupported.push("Python imports — Apogee's module system is different");
  }
  if (sourceCode.includes("try:") || sourceCode.includes("except")) {
    unsupported.push("try/except — Apogee doesn't have exception handling syntax yet");
  }
  if (sourceCode.includes("with ")) {
    unsupported.push("Context managers (with) — not yet supported in Apogee");
  }
  if (sourceCode.includes("lambda ")) {
    unsupported.push("Lambda expressions — use named functions in Apogee");
  }

  apogeeCode = outputLines.join("\n");

  // Validate the output compiles
  const validation = compile(apogeeCode);
  if (!validation.success) {
    notes.push("Note: the transpiled code has compilation errors — manual adjustment needed");
    notes.push(...(validation.errors || []).map((e) => `Line ${e.line}: ${e.message}`));
  }

  return {
    apogee_code: apogeeCode,
    notes,
    unsupported_features: unsupported,
    compiles: validation.success,
  };
}

function corpusAdd(apogeeCode, description, category) {
  // Validate the code compiles
  const validation = compile(apogeeCode);
  if (!validation.success) {
    return {
      accepted: false,
      reason: "Code does not compile",
      errors: validation.errors,
      corpus_id: null,
      corpus_size: getCorpusSize(),
    };
  }

  // Write to corpus
  const corpusDir = join(new URL("../..", import.meta.url).pathname, "content-gen", "content", "corpus", "examples");
  if (!existsSync(corpusDir)) mkdirSync(corpusDir, { recursive: true });

  const id = randomBytes(4).toString("hex");
  const filename = `mcp_${category}_${id}.apg`;
  const header = `// ${description}\n// Category: ${category}\n// Added via MCP: ${new Date().toISOString()}\n\n`;

  writeFileSync(join(corpusDir, filename), header + apogeeCode);

  return {
    accepted: true,
    corpus_id: `mcp_${category}_${id}`,
    corpus_size: getCorpusSize(),
  };
}

function getCorpusSize() {
  const corpusDir = join(new URL("../..", import.meta.url).pathname, "content-gen", "content", "corpus", "examples");
  try {
    return readdirSync(corpusDir).filter((f) => f.endsWith(".apg")).length;
  } catch {
    return 0;
  }
}

// ── Start Server ──

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Apogee MCP server running on stdio");
}

main().catch((err) => {
  console.error("Failed to start Apogee MCP server:", err);
  process.exit(1);
});
