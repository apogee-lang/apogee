import {
  createConnection,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
  InitializeResult,
  TextDocumentSyncKind,
  CompletionItem,
  CompletionItemKind,
  Hover,
  MarkupKind,
  DefinitionParams,
  Location,
  ReferenceParams,
  RenameParams,
  WorkspaceEdit,
  TextEdit,
  CodeAction,
  CodeActionKind,
  CodeActionParams,
  DocumentFormattingParams,
  TextDocumentPositionParams,
  Range,
  Position,
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

// ── Symbol Table ──

interface SymbolInfo {
  name: string;
  kind: "function" | "type" | "variable" | "field" | "param";
  type: string;
  detail: string;
  intent?: string;
  line: number;
  col: number;
  uri: string;
  params?: { name: string; type: string }[];
  fields?: { name: string; type: string }[];
  endLine?: number;
}

const symbolsByUri = new Map<string, SymbolInfo[]>();

// ── Built-in completions ──

const BUILTIN_FUNCTIONS: CompletionItem[] = [
  { label: "print", kind: CompletionItemKind.Function, detail: "(value: Any) -> Void", documentation: "Print a value to stdout" },
  { label: "len", kind: CompletionItemKind.Function, detail: "(collection: Any) -> Int", documentation: "Get length of a collection" },
  { label: "str", kind: CompletionItemKind.Function, detail: "(value: Any) -> String", documentation: "Convert to string" },
  { label: "int", kind: CompletionItemKind.Function, detail: "(value: Any) -> Int", documentation: "Convert to integer" },
  { label: "float", kind: CompletionItemKind.Function, detail: "(value: Any) -> Float", documentation: "Convert to float" },
  { label: "input", kind: CompletionItemKind.Function, detail: "(prompt: String) -> String", documentation: "Read line from stdin" },
  { label: "range", kind: CompletionItemKind.Function, detail: "(n: Int) -> [Int]", documentation: "Generate range [0..n)" },
];

const KEYWORD_COMPLETIONS: CompletionItem[] = [
  { label: "fn", kind: CompletionItemKind.Keyword, detail: "Function declaration" },
  { label: "type", kind: CompletionItemKind.Keyword, detail: "Type definition" },
  { label: "let", kind: CompletionItemKind.Keyword, detail: "Variable binding" },
  { label: "if", kind: CompletionItemKind.Keyword, detail: "Conditional" },
  { label: "else", kind: CompletionItemKind.Keyword, detail: "Else branch" },
  { label: "for", kind: CompletionItemKind.Keyword, detail: "For loop" },
  { label: "while", kind: CompletionItemKind.Keyword, detail: "While loop" },
  { label: "return", kind: CompletionItemKind.Keyword, detail: "Return statement" },
  { label: "from", kind: CompletionItemKind.Keyword, detail: "Query expression" },
  { label: "where", kind: CompletionItemKind.Keyword, detail: "Filter/constraint clause" },
  { label: "spawn", kind: CompletionItemKind.Keyword, detail: "Concurrent block" },
  { label: "match", kind: CompletionItemKind.Keyword, detail: "Pattern match" },
  { label: "import", kind: CompletionItemKind.Keyword, detail: "Module import" },
  { label: "async", kind: CompletionItemKind.Keyword, detail: "Async modifier" },
  { label: "await", kind: CompletionItemKind.Keyword, detail: "Await expression" },
  { label: "true", kind: CompletionItemKind.Keyword, detail: "Boolean true" },
  { label: "false", kind: CompletionItemKind.Keyword, detail: "Boolean false" },
  { label: "null", kind: CompletionItemKind.Keyword, detail: "Null value" },
];

const TYPE_COMPLETIONS: CompletionItem[] = [
  { label: "Int", kind: CompletionItemKind.TypeParameter, detail: "Integer type" },
  { label: "Float", kind: CompletionItemKind.TypeParameter, detail: "Float type" },
  { label: "String", kind: CompletionItemKind.TypeParameter, detail: "String type" },
  { label: "Bool", kind: CompletionItemKind.TypeParameter, detail: "Boolean type" },
  { label: "Void", kind: CompletionItemKind.TypeParameter, detail: "Void type" },
  { label: "Any", kind: CompletionItemKind.TypeParameter, detail: "Any type (escape hatch)" },
];

const INTENT_SUGGESTIONS: CompletionItem[] = [
  { label: '@intent("validate input and return sanitized result")', kind: CompletionItemKind.Snippet, insertText: '@intent("${1:validate input and return sanitized result}")', detail: "Intent: validation" },
  { label: '@intent("transform data without side effects")', kind: CompletionItemKind.Snippet, insertText: '@intent("${1:transform data without side effects}")', detail: "Intent: transformation" },
  { label: '@intent("fetch data from external service, handle errors")', kind: CompletionItemKind.Snippet, insertText: '@intent("${1:fetch data from external service, handle errors}")', detail: "Intent: API call" },
  { label: '@intent("never return null, always provide a default")', kind: CompletionItemKind.Snippet, insertText: '@intent("${1:never return null, always provide a default}")', detail: "Intent: null safety" },
];

// ── Initialization ──

connection.onInitialize((_params: InitializeParams): InitializeResult => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: [".", "@", "\\"],
      },
      hoverProvider: true,
      definitionProvider: true,
      referencesProvider: true,
      renameProvider: { prepareProvider: false },
      codeActionProvider: {
        codeActionKinds: [
          CodeActionKind.QuickFix,
          CodeActionKind.Refactor,
        ],
      },
      documentFormattingProvider: true,
    },
  };
});

// ── Diagnostics ──

documents.onDidChangeContent((change) => {
  validateDocument(change.document);
});

function validateDocument(doc: TextDocument): void {
  const text = doc.getText();
  const diagnostics: Diagnostic[] = [];
  const symbols: SymbolInfo[] = [];

  const lines = text.split("\n");
  let pendingIntent: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();

    // Extract @intent
    const intentMatch = trimmed.match(/^@intent\("([^"]*)"\)/);
    if (intentMatch) {
      pendingIntent = intentMatch[1];
    }

    // Extract function declarations
    const fnMatch = trimmed.match(/^(?:async\s+)?fn\s+(?:`([^`]+)`|([a-zA-Z_]\w*))\s*\(([^)]*)\)(?:\s*->\s*(\S+))?/);
    if (fnMatch) {
      const name = fnMatch[1] || fnMatch[2];
      const paramsStr = fnMatch[3] || "";
      const returnType = fnMatch[4] || "Void";
      const params = parseParams(paramsStr);
      const detail = `fn ${name}(${params.map(p => `${p.name}: ${p.type}`).join(", ")}) -> ${returnType}`;
      symbols.push({
        name, kind: "function", type: returnType, detail,
        intent: pendingIntent ?? undefined,
        params, line: i, col: line.indexOf(name), uri: doc.uri,
      });
      pendingIntent = null;
    }

    // Extract type declarations
    const typeMatch = trimmed.match(/^type\s+([A-Z]\w*)\s*\{/);
    if (typeMatch) {
      const typeName = typeMatch[1];
      const fields: { name: string; type: string }[] = [];
      // Scan ahead for fields
      for (let j = i + 1; j < lines.length; j++) {
        const fline = lines[j].trim();
        if (fline === "}" || fline.startsWith("}")) break;
        const fieldMatch = fline.match(/^(\w+)\s*:\s*(.+?)(?:\s*=.*)?$/);
        if (fieldMatch) {
          fields.push({ name: fieldMatch[1], type: fieldMatch[2].trim().replace(/,$/, "").trim() });
        }
      }
      symbols.push({
        name: typeName, kind: "type", type: typeName,
        detail: `type ${typeName} { ${fields.map(f => `${f.name}: ${f.type}`).join(", ")} }`,
        fields, line: i, col: line.indexOf(typeName), uri: doc.uri,
      });
    }

    // Extract let bindings
    const letMatch = trimmed.match(/^let\s+(\w+)(?:\s*:\s*(\S+))?\s*=/);
    if (letMatch) {
      const varName = letMatch[1];
      const varType = letMatch[2] || "inferred";
      symbols.push({
        name: varName, kind: "variable", type: varType,
        detail: `let ${varName}: ${varType}`,
        line: i, col: line.indexOf(varName), uri: doc.uri,
      });
    }

    // ── Diagnostics: detect common errors ──

    // Unterminated string
    const stringParts = line.split('"');
    if (stringParts.length % 2 === 0) {
      const inComment = trimmed.startsWith("//");
      if (!inComment) {
        // Check it's not a multiline or escaped
        const stripped = line.replace(/\\"/g, "");
        const quoteCount = (stripped.match(/"/g) || []).length;
        if (quoteCount % 2 !== 0) {
          diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: { start: { line: i, character: 0 }, end: { line: i, character: line.length } },
            message: "Unterminated string literal",
            source: "apogee",
          });
        }
      }
    }

    // Null assignment to non-nullable
    const nullAssign = trimmed.match(/^let\s+(\w+)\s*:\s*([A-Z]\w+)\s*=\s*null\s*$/);
    if (nullAssign && !nullAssign[2].endsWith("?")) {
      const col = line.indexOf("null");
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: { start: { line: i, character: col }, end: { line: i, character: col + 4 } },
        message: `Cannot assign null to non-nullable type '${nullAssign[2]}'. Use '${nullAssign[2]}?' to make it nullable.`,
        source: "apogee",
        data: { fix: "make-nullable", typeName: nullAssign[2], varName: nullAssign[1] },
      });
    }

    // Constraint violation on literal
    const structField = trimmed.match(/(\w+)\s*:\s*(-?\d+)/g);
    if (structField) {
      // Check against known type constraints (simple heuristic)
      for (const sf of structField) {
        const m = sf.match(/(\w+)\s*:\s*(-?\d+)/);
        if (m) {
          const val = parseInt(m[2]);
          if (val < 0) {
            // Look for a type with a >= 0 constraint on this field
            for (const sym of symbols) {
              if (sym.kind === "type" && sym.fields) {
                for (const f of sym.fields) {
                  if (f.name === m[1] && f.type.includes("where") && f.type.includes(">= 0")) {
                    const col = line.indexOf(m[2]);
                    diagnostics.push({
                      severity: DiagnosticSeverity.Error,
                      range: { start: { line: i, character: col }, end: { line: i, character: col + m[2].length } },
                      message: `Constraint violation: ${m[1]} = ${val} does not satisfy ${m[1]} >= 0`,
                      source: "apogee",
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

    // Missing @intent warning on public functions
    if (fnMatch && !pendingIntent && !trimmed.startsWith("//")) {
      // Already consumed pendingIntent above, so if it was null the fn has no intent
      const fnName = fnMatch[1] || fnMatch[2];
      const fnCol = line.indexOf("fn");
      if (fnCol >= 0) {
        diagnostics.push({
          severity: DiagnosticSeverity.Hint,
          range: { start: { line: i, character: fnCol }, end: { line: i, character: fnCol + 2 + fnName.length + 1 } },
          message: `Function '${fnName}' has no @intent annotation. Consider adding one for AI verification.`,
          source: "apogee",
          data: { fix: "add-intent", fnName, fnLine: i },
        });
      }
    }
  }

  symbolsByUri.set(doc.uri, symbols);
  connection.sendDiagnostics({ uri: doc.uri, diagnostics });
}

function parseParams(paramsStr: string): { name: string; type: string }[] {
  if (!paramsStr.trim()) return [];
  return paramsStr.split(",").map((p) => {
    const parts = p.trim().split(":");
    return {
      name: parts[0]?.trim() || "",
      type: parts[1]?.trim() || "Any",
    };
  });
}

// ── Completion ──

connection.onCompletion((params: TextDocumentPositionParams): CompletionItem[] => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];

  const line = doc.getText({
    start: { line: params.position.line, character: 0 },
    end: params.position,
  });

  // After @, suggest intent
  if (line.endsWith("@")) {
    return INTENT_SUGGESTIONS;
  }

  // After a colon (type position), suggest types
  if (line.match(/:\s*$/)) {
    const userTypes = (symbolsByUri.get(params.textDocument.uri) || [])
      .filter((s) => s.kind === "type")
      .map((s) => ({
        label: s.name,
        kind: CompletionItemKind.TypeParameter,
        detail: s.detail,
      }));
    return [...TYPE_COMPLETIONS, ...userTypes];
  }

  // After dot, suggest fields
  const dotMatch = line.match(/(\w+)\.\s*$/);
  if (dotMatch) {
    const varName = dotMatch[1];
    const symbols = symbolsByUri.get(params.textDocument.uri) || [];
    const varSym = symbols.find((s) => s.name === varName && s.kind === "variable");
    if (varSym) {
      const typeSym = symbols.find((s) => s.name === varSym.type && s.kind === "type");
      if (typeSym?.fields) {
        return typeSym.fields.map((f) => ({
          label: f.name,
          kind: CompletionItemKind.Field,
          detail: f.type,
        }));
      }
    }
  }

  // General completions
  const userSymbols = (symbolsByUri.get(params.textDocument.uri) || []).map((s) => ({
    label: s.name,
    kind: s.kind === "function" ? CompletionItemKind.Function
      : s.kind === "type" ? CompletionItemKind.Class
      : CompletionItemKind.Variable,
    detail: s.detail,
    documentation: s.intent ? `Intent: ${s.intent}` : undefined,
  }));

  return [...KEYWORD_COMPLETIONS, ...BUILTIN_FUNCTIONS, ...TYPE_COMPLETIONS, ...userSymbols];
});

// ── Hover ──

connection.onHover((params: TextDocumentPositionParams): Hover | null => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;

  const word = getWordAtPosition(doc, params.position);
  if (!word) return null;

  const symbols = symbolsByUri.get(params.textDocument.uri) || [];
  const sym = symbols.find((s) => s.name === word);

  if (sym) {
    const parts: string[] = [];
    parts.push("```apogee");
    parts.push(sym.detail);
    parts.push("```");
    if (sym.intent) {
      parts.push("");
      parts.push(`*Intent: ${sym.intent}*`);
    }
    if (sym.kind === "type" && sym.fields) {
      parts.push("");
      parts.push("**Fields:**");
      for (const f of sym.fields) {
        parts.push(`- \`${f.name}\`: \`${f.type}\``);
      }
    }
    return {
      contents: { kind: MarkupKind.Markdown, value: parts.join("\n") },
    };
  }

  // Built-in hover
  const builtin = BUILTIN_FUNCTIONS.find((b) => b.label === word);
  if (builtin) {
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: `\`\`\`apogee\nfn ${builtin.label}${builtin.detail}\n\`\`\`\n\n${builtin.documentation || ""}`,
      },
    };
  }

  return null;
});

// ── Go to Definition ──

connection.onDefinition((params: DefinitionParams): Location | null => {
  const word = getWordFromParams(params);
  if (!word) return null;

  const symbols = symbolsByUri.get(params.textDocument.uri) || [];
  const sym = symbols.find((s) => s.name === word);
  if (sym) {
    return Location.create(sym.uri, {
      start: { line: sym.line, character: sym.col },
      end: { line: sym.line, character: sym.col + sym.name.length },
    });
  }
  return null;
});

// ── Find References ──

connection.onReferences((params: ReferenceParams): Location[] => {
  const word = getWordFromParams(params);
  if (!word) return [];

  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];

  const text = doc.getText();
  const lines = text.split("\n");
  const locations: Location[] = [];

  const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, "g");
  for (let i = 0; i < lines.length; i++) {
    let m;
    while ((m = regex.exec(lines[i])) !== null) {
      locations.push(
        Location.create(params.textDocument.uri, {
          start: { line: i, character: m.index },
          end: { line: i, character: m.index + word.length },
        })
      );
    }
  }
  return locations;
});

// ── Rename ──

connection.onRenameRequest((params: RenameParams): WorkspaceEdit | null => {
  const word = getWordFromParams(params);
  if (!word) return null;

  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;

  const text = doc.getText();
  const lines = text.split("\n");
  const edits: TextEdit[] = [];

  const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, "g");
  for (let i = 0; i < lines.length; i++) {
    let m;
    while ((m = regex.exec(lines[i])) !== null) {
      edits.push(TextEdit.replace(
        Range.create(Position.create(i, m.index), Position.create(i, m.index + word.length)),
        params.newName
      ));
    }
  }

  return { changes: { [params.textDocument.uri]: edits } };
});

// ── Code Actions ──

connection.onCodeAction((params: CodeActionParams): CodeAction[] => {
  const actions: CodeAction[] = [];
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return actions;

  for (const diag of params.context.diagnostics) {
    const data = diag.data as { fix?: string; typeName?: string; varName?: string; fnName?: string; fnLine?: number } | undefined;

    if (data?.fix === "make-nullable" && data.typeName && data.varName) {
      actions.push({
        title: `Make type nullable: ${data.typeName}?`,
        kind: CodeActionKind.QuickFix,
        diagnostics: [diag],
        edit: {
          changes: {
            [params.textDocument.uri]: [
              TextEdit.replace(
                Range.create(
                  Position.create(diag.range.start.line, 0),
                  Position.create(diag.range.start.line, doc.getText().split("\n")[diag.range.start.line].length)
                ),
                doc.getText().split("\n")[diag.range.start.line].replace(
                  new RegExp(`:\\s*${escapeRegex(data.typeName)}\\b`),
                  `: ${data.typeName}?`
                )
              ),
            ],
          },
        },
      });
    }

    if (data?.fix === "add-intent" && data.fnLine !== undefined) {
      const line = doc.getText().split("\n")[data.fnLine];
      const indent = line.match(/^(\s*)/)?.[1] || "";
      actions.push({
        title: `Add @intent annotation to '${data.fnName}'`,
        kind: CodeActionKind.QuickFix,
        diagnostics: [diag],
        edit: {
          changes: {
            [params.textDocument.uri]: [
              TextEdit.insert(
                Position.create(data.fnLine, 0),
                `${indent}@intent("describe what ${data.fnName} does")\n`
              ),
            ],
          },
        },
      });
    }
  }

  // Refactor: Extract function (when text is selected)
  if (params.range.start.line !== params.range.end.line ||
      params.range.start.character !== params.range.end.character) {
    const selectedText = doc.getText(params.range);
    if (selectedText.trim()) {
      actions.push({
        title: "Extract to function",
        kind: CodeActionKind.Refactor,
        command: {
          title: "Extract to function",
          command: "apogee.extractFunction",
          arguments: [params.textDocument.uri, params.range, selectedText],
        },
      });
    }
  }

  return actions;
});

// ── Document Formatting ──

connection.onDocumentFormatting((params: DocumentFormattingParams): TextEdit[] => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];

  const text = doc.getText();
  const lines = text.split("\n");
  const formatted: string[] = [];
  let indent = 0;
  const tabStr = " ".repeat(params.options.tabSize);

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) { formatted.push(""); continue; }

    // Decrease indent for closing braces
    if (trimmed.startsWith("}")) indent = Math.max(0, indent - 1);

    formatted.push(tabStr.repeat(indent) + trimmed);

    // Increase indent after opening braces
    if (trimmed.endsWith("{")) indent++;
  }

  // Remove excessive blank lines (max 1)
  const cleaned: string[] = [];
  let lastBlank = false;
  for (const l of formatted) {
    if (l.trim() === "") {
      if (!lastBlank) cleaned.push(l);
      lastBlank = true;
    } else {
      cleaned.push(l);
      lastBlank = false;
    }
  }

  const result = cleaned.join("\n");
  if (result === text) return [];

  return [
    TextEdit.replace(
      Range.create(Position.create(0, 0), Position.create(lines.length, 0)),
      result
    ),
  ];
});

// ── Helpers ──

function getWordAtPosition(doc: TextDocument, pos: Position): string | null {
  const line = doc.getText({
    start: { line: pos.line, character: 0 },
    end: { line: pos.line, character: 1000 },
  });
  const before = line.substring(0, pos.character);
  const after = line.substring(pos.character);
  const startMatch = before.match(/[a-zA-Z_]\w*$/);
  const endMatch = after.match(/^\w*/);
  if (!startMatch) return null;
  return startMatch[0] + (endMatch?.[0] || "");
}

function getWordFromParams(params: { textDocument: { uri: string }; position: Position }): string | null {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;
  return getWordAtPosition(doc, params.position);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Start ──

documents.listen(connection);
connection.listen();
