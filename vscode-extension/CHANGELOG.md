# Changelog

## [0.1.0] - 2026-04-12

### Added

- TextMate grammar for full Apogee syntax highlighting
  - Keywords, types, annotations, string interpolation, comments
  - Nullable types highlighted distinctly
  - Constraint expressions (`where`) highlighted
  - `@intent` annotation strings in italic
- Language Server Protocol (LSP) with:
  - Real-time diagnostics (null safety, constraint violations, missing intent)
  - Hover information (type signatures, intent annotations, field lists)
  - Autocomplete (keywords, types, stdlib, user symbols, intent suggestions)
  - Go to Definition
  - Find All References
  - Rename Symbol
  - Document Formatting
  - Code Actions (fix null safety, add @intent, extract function)
- 16 code snippets (fn, type, spawn, from, match, etc.)
- Extension commands:
  - Run File (Cmd+Shift+R)
  - Check File (Cmd+Shift+T)
  - Open Playground (opens apogee-lang.dev with current code)
  - Show Compiled Python (side-by-side view)
- Status bar indicator
- File icon for .apg files
