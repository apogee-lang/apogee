import * as path from "path";
import * as vscode from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";

let client: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
  // ── LSP Server ──
  const serverModule = context.asAbsolutePath(
    path.join("server", "out", "server.js")
  );

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: { execArgv: ["--nolazy", "--inspect=6009"] },
    },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "apogee" }],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher("**/*.apg"),
    },
  };

  client = new LanguageClient(
    "apogeeLanguageServer",
    "Apogee Language Server",
    serverOptions,
    clientOptions
  );

  client.start();

  // ── Commands ──

  context.subscriptions.push(
    vscode.commands.registerCommand("apogee.runFile", runFile),
    vscode.commands.registerCommand("apogee.checkFile", checkFile),
    vscode.commands.registerCommand("apogee.openPlayground", openPlayground),
    vscode.commands.registerCommand("apogee.showCompiledPython", showCompiledPython),
    vscode.commands.registerCommand("apogee.extractFunction", extractFunction),
  );

  // ── Status Bar ──
  const statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBar.text = "$(zap) Apogee";
  statusBar.tooltip = "Apogee Language Support";
  statusBar.command = "apogee.checkFile";
  statusBar.show();
  context.subscriptions.push(statusBar);
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) return undefined;
  return client.stop();
}

// ── Command: Run File ──

async function runFile() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== "apogee") {
    vscode.window.showWarningMessage("Open an .apg file to run.");
    return;
  }

  await editor.document.save();
  const filePath = editor.document.fileName;

  const terminal = getOrCreateTerminal();
  terminal.show();
  terminal.sendText(`apogee run "${filePath}"`);
}

// ── Command: Check File ──

async function checkFile() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== "apogee") {
    vscode.window.showWarningMessage("Open an .apg file to check.");
    return;
  }

  await editor.document.save();
  const filePath = editor.document.fileName;

  const terminal = getOrCreateTerminal();
  terminal.show();
  terminal.sendText(`apogee check "${filePath}"`);
}

// ── Command: Open Playground ──

async function openPlayground() {
  const editor = vscode.window.activeTextEditor;
  let url = "https://apogee-lang.dev";

  if (editor && editor.document.languageId === "apogee") {
    const code = editor.document.getText();
    const encoded = Buffer.from(code).toString("base64");
    url = `https://apogee-lang.dev?code=${encoded}`;
  }

  vscode.env.openExternal(vscode.Uri.parse(url));
}

// ── Command: Show Compiled Python ──

async function showCompiledPython() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== "apogee") {
    vscode.window.showWarningMessage("Open an .apg file first.");
    return;
  }

  await editor.document.save();
  const filePath = editor.document.fileName;

  try {
    const cp = await import("child_process");
    const result = cp.execSync(`apogee compile "${filePath}" -o /dev/stdout`, {
      encoding: "utf-8",
      timeout: 10000,
    });

    const doc = await vscode.workspace.openTextDocument({
      content: result,
      language: "python",
    });
    await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`Compilation failed: ${msg}`);
  }
}

// ── Command: Extract Function ──

async function extractFunction(
  uri: string,
  range: vscode.Range,
  selectedText: string
) {
  const name = await vscode.window.showInputBox({
    prompt: "Function name",
    placeHolder: "extracted_function",
  });
  if (!name) return;

  const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(uri));
  const edit = new vscode.WorkspaceEdit();

  const fnDef = `\n@intent("extracted from inline code")\nfn ${name}() -> Any {\n  ${selectedText}\n}\n`;

  // Insert function before the line containing the selection
  edit.insert(vscode.Uri.parse(uri), new vscode.Position(range.start.line, 0), fnDef + "\n");

  // Replace selection with function call
  edit.replace(vscode.Uri.parse(uri), range, `${name}()`);

  await vscode.workspace.applyEdit(edit);
}

// ── Helpers ──

function getOrCreateTerminal(): vscode.Terminal {
  const existing = vscode.window.terminals.find(
    (t) => t.name === "Apogee"
  );
  if (existing) return existing;
  return vscode.window.createTerminal("Apogee");
}
