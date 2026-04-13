"use client";

import { useRef, useCallback } from "react";
import MonacoEditor, { OnMount, BeforeMount } from "@monaco-editor/react";
import {
  APOGEE_LANG_ID,
  languageConfig,
  monarchTokens,
} from "@/lib/apogee-language";
import { APOGEE_THEME_ID, apogeeTheme } from "@/lib/apogee-theme";
import type { editor } from "monaco-editor";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  errors?: { line: number; col: number; msg: string }[];
}

export default function Editor({ value, onChange, onRun, errors = [] }: Props) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<editor.IEditorDecorationsCollection | null>(null);

  const handleBeforeMount: BeforeMount = useCallback((monaco) => {
    if (!monaco.languages.getLanguages().some((l: { id: string }) => l.id === APOGEE_LANG_ID)) {
      monaco.languages.register({ id: APOGEE_LANG_ID, extensions: [".apg"] });
      monaco.languages.setLanguageConfiguration(APOGEE_LANG_ID, languageConfig);
      monaco.languages.setMonarchTokensProvider(APOGEE_LANG_ID, monarchTokens);
    }
    monaco.editor.defineTheme(APOGEE_THEME_ID, apogeeTheme);
  }, []);

  const handleMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      decorationsRef.current = editor.createDecorationsCollection([]);

      // Cmd+Enter / Ctrl+Enter to run
      editor.addAction({
        id: "apogee-run",
        label: "Run Apogee Program",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
        run: () => onRun(),
      });

      editor.focus();
    },
    [onRun]
  );

  // Update error decorations when errors change
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);

  const handleEditorDidMount: OnMount = useCallback(
    (editor, monaco) => {
      monacoRef.current = monaco;
      handleMount(editor, monaco);
    },
    [handleMount]
  );

  // Apply error markers
  if (editorRef.current && monacoRef.current && errors.length > 0) {
    const monaco = monacoRef.current;
    const model = editorRef.current.getModel();
    if (model) {
      monaco.editor.setModelMarkers(
        model,
        "apogee",
        errors.map((e) => ({
          severity: monaco.MarkerSeverity.Error,
          message: e.msg,
          startLineNumber: e.line,
          startColumn: e.col,
          endLineNumber: e.line,
          endColumn: e.col + 10,
        }))
      );
    }
  } else if (editorRef.current && monacoRef.current) {
    const model = editorRef.current.getModel();
    if (model) monacoRef.current.editor.setModelMarkers(model, "apogee", []);
  }

  return (
    <MonacoEditor
      height="100%"
      language={APOGEE_LANG_ID}
      theme={APOGEE_THEME_ID}
      value={value}
      onChange={(v) => onChange(v ?? "")}
      beforeMount={handleBeforeMount}
      onMount={handleEditorDidMount}
      loading={
        <div className="flex items-center justify-center h-full text-zinc-500">
          Loading editor...
        </div>
      }
      options={{
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        fontLigatures: true,
        lineNumbers: "on",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        padding: { top: 16, bottom: 16 },
        bracketPairColorization: { enabled: true },
        automaticLayout: true,
        tabSize: 2,
        renderWhitespace: "selection",
        smoothScrolling: true,
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        wordWrap: "on",
      }}
    />
  );
}
