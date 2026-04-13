/**
 * Monaco language definition for Apogee (.apg files)
 */
import type { languages } from "monaco-editor";

export const APOGEE_LANG_ID = "apogee";

export const languageConfig: languages.LanguageConfiguration = {
  comments: {
    lineComment: "//",
    blockComment: ["/*", "*/"],
  },
  brackets: [
    ["{", "}"],
    ["[", "]"],
    ["(", ")"],
  ],
  autoClosingPairs: [
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "(", close: ")" },
    { open: '"', close: '"' },
    { open: "`", close: "`" },
  ],
  surroundingPairs: [
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "(", close: ")" },
    { open: '"', close: '"' },
    { open: "`", close: "`" },
  ],
  indentationRules: {
    increaseIndentPattern: /^\s*(fn|type|if|else|for|while|spawn|match)\b.*\{\s*$/,
    decreaseIndentPattern: /^\s*\}/,
  },
};

export const monarchTokens: languages.IMonarchLanguage = {
  keywords: [
    "fn", "type", "let", "return", "if", "else", "for", "in", "while",
    "match", "from", "where", "spawn", "import", "async", "await",
  ],
  typeKeywords: [
    "Int", "Float", "String", "Bool", "Void", "Any",
  ],
  constants: ["true", "false", "null"],
  operators: [
    "=", "==", "!=", "<", ">", "<=", ">=", "&&", "||", "!",
    "+", "-", "*", "/", "%", "->", "=>", "?", ".",
  ],

  tokenizer: {
    root: [
      // Annotations
      [/@intent/, "annotation"],
      [/@\w+/, "annotation"],

      // Identifiers and keywords
      [/`[^`]+`/, "variable.backtick"],
      [/[A-Z]\w*/, {
        cases: {
          "@typeKeywords": "type.identifier",
          "@default": "type.identifier",
        },
      }],
      [/[a-z_]\w*/, {
        cases: {
          "@keywords": "keyword",
          "@constants": "constant",
          "@default": "identifier",
        },
      }],

      // Whitespace and comments
      { include: "@whitespace" },

      // Strings
      [/"/, { token: "string.quote", bracket: "@open", next: "@string" }],

      // Numbers
      [/\d+\.\d+/, "number.float"],
      [/\d+/, "number"],

      // Operators and delimiters
      [/[{}()\[\]]/, "@brackets"],
      [/->/, "operator.arrow"],
      [/=>/, "operator.arrow"],
      [/[=!<>]=?/, "operator"],
      [/[+\-*/%]/, "operator"],
      [/&&|\|\|/, "operator"],
      [/[?.,;:]/, "delimiter"],
    ],

    string: [
      [/\\[nt\\"r]/, "string.escape"],
      [/\\\(/, { token: "string.interpolation.open", next: "@interpolation" }],
      [/"/, { token: "string.quote", bracket: "@close", next: "@pop" }],
      [/[^"\\]+/, "string"],
    ],

    interpolation: [
      [/\)/, { token: "string.interpolation.close", next: "@pop" }],
      [/[a-z_]\w*/, {
        cases: {
          "@keywords": "keyword",
          "@default": "identifier",
        },
      }],
      [/[A-Z]\w*/, "type.identifier"],
      [/\d+/, "number"],
      [/[+\-*/%=<>!&|.]+/, "operator"],
      [/[(),]/, "delimiter"],
    ],

    whitespace: [
      [/[ \t\r\n]+/, "white"],
      [/\/\/.*$/, "comment"],
      [/\/\*/, "comment", "@comment"],
    ],

    comment: [
      [/[^/*]+/, "comment"],
      [/\/\*/, "comment", "@push"],
      [/\*\//, "comment", "@pop"],
      [/[/*]/, "comment"],
    ],
  },
};
