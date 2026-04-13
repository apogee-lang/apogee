"use client";

import { useRef, useCallback, useEffect } from "react";
import MonacoEditor, { OnMount, BeforeMount } from "@monaco-editor/react";
import {
  APOGEE_LANG_ID,
  languageConfig,
  monarchTokens,
} from "@/lib/apogee-language";
import { APOGEE_THEME_ID, apogeeTheme } from "@/lib/apogee-theme";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  errors?: { line: number; col: number; msg: string }[];
}

export default function Editor({ value, onChange, onRun, errors = [] }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const monacoRef = useRef<any>(null);

  const handleBeforeMount: BeforeMount = useCallback((monaco) => {
    if (
      !monaco.languages
        .getLanguages()
        .some((l: { id: string }) => l.id === APOGEE_LANG_ID)
    ) {
      monaco.languages.register({ id: APOGEE_LANG_ID, extensions: [".apg"] });
      monaco.languages.setLanguageConfiguration(
        APOGEE_LANG_ID,
        languageConfig
      );
      monaco.languages.setMonarchTokensProvider(
        APOGEE_LANG_ID,
        monarchTokens
      );
    }
    monaco.editor.defineTheme(APOGEE_THEME_ID, apogeeTheme);
  }, []);

  const onRunRef = useRef(onRun);
  onRunRef.current = onRun;

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.addAction({
      id: "apogee-run",
      label: "Run Apogee Program",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: () => onRunRef.current(),
    });

    editor.focus();
  }, []);

  // Apply error markers when errors change
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const model = editor.getModel();
    if (!model) return;

    if (errors.length > 0) {
      monaco.editor.setModelMarkers(
        model,
        "apogee",
        errors.map((e: { line: number; col: number; msg: string }) => ({
          severity: monaco.MarkerSeverity.Error,
          message: e.msg,
          startLineNumber: Math.max(1, e.line),
          startColumn: Math.max(1, e.col),
          endLineNumber: Math.max(1, e.line),
          endColumn: Math.max(1, e.col) + 10,
        }))
      );
    } else {
      monaco.editor.setModelMarkers(model, "apogee", []);
    }
  }, [errors]);

  return (
    <MonacoEditor
      height="100%"
      language={APOGEE_LANG_ID}
      theme={APOGEE_THEME_ID}
      value={value}
      onChange={(v) => onChange(v ?? "")}
      beforeMount={handleBeforeMount}
      onMount={handleMount}
      loading={
        <div className="flex items-center justify-center h-full text-zinc-500">
          Loading editor...
        </div>
      }
      options={{
        fontSize: 14,
        fontFamily:
          "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
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
