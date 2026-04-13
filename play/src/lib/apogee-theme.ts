/**
 * Apogee dark theme for Monaco — dark ink background, acid green accents.
 */
import type { editor } from "monaco-editor";

export const APOGEE_THEME_ID = "apogee-dark";

export const apogeeTheme: editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [
    // Keywords
    { token: "keyword", foreground: "a8ff60", fontStyle: "bold" },

    // Types
    { token: "type.identifier", foreground: "70d4ff" },

    // Annotations
    { token: "annotation", foreground: "ffd760", fontStyle: "italic" },

    // Strings
    { token: "string", foreground: "e8c87a" },
    { token: "string.quote", foreground: "e8c87a" },
    { token: "string.escape", foreground: "ff9d6f" },
    { token: "string.interpolation.open", foreground: "a8ff60" },
    { token: "string.interpolation.close", foreground: "a8ff60" },

    // Numbers
    { token: "number", foreground: "ff8f6f" },
    { token: "number.float", foreground: "ff8f6f" },

    // Constants
    { token: "constant", foreground: "ff8f6f" },

    // Operators
    { token: "operator", foreground: "9ca3af" },
    { token: "operator.arrow", foreground: "a8ff60" },
    { token: "delimiter", foreground: "6b7280" },

    // Comments
    { token: "comment", foreground: "4a5568", fontStyle: "italic" },

    // Identifiers
    { token: "identifier", foreground: "e2e8f0" },
    { token: "variable.backtick", foreground: "d8b4fe" },
  ],
  colors: {
    "editor.background": "#0a0e17",
    "editor.foreground": "#e2e8f0",
    "editor.lineHighlightBackground": "#111827",
    "editor.selectionBackground": "#1e3a5f88",
    "editor.inactiveSelectionBackground": "#1e3a5f44",
    "editorCursor.foreground": "#a8ff60",
    "editorLineNumber.foreground": "#374151",
    "editorLineNumber.activeForeground": "#6b7280",
    "editor.selectionHighlightBackground": "#a8ff6015",
    "editorBracketMatch.background": "#a8ff6020",
    "editorBracketMatch.border": "#a8ff6060",
    "editorIndentGuide.background": "#1f2937",
    "editorIndentGuide.activeBackground": "#374151",
    "editorWhitespace.foreground": "#1f2937",
    "scrollbarSlider.background": "#1f293780",
    "scrollbarSlider.hoverBackground": "#374151",
    "scrollbarSlider.activeBackground": "#4b5563",
    "minimap.background": "#0a0e17",
  },
};
