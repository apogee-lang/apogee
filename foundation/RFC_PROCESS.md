# Apogee Enhancement Proposal (AEP) Process

This document describes how community members propose changes to the Apogee programming language.

## Overview

Any community member can propose a language change by submitting an Apogee Enhancement Proposal (AEP). AEPs are discussed publicly, reviewed by the Core Team, and decided by vote.

The goal is to ensure every language change is well-motivated, clearly specified, and carefully evaluated for its impact on the language, its users, and its ecosystem.

## When to Write an AEP

Write an AEP if you want to:

- Add a new keyword or syntax construct
- Change the type system (new type features, constraint extensions)
- Modify the memory or concurrency model
- Add a standard library module
- Make a breaking change to existing behavior
- Change the compilation model or add a new target

Do NOT write an AEP for:

- Bug fixes (file an issue)
- Documentation improvements (open a PR)
- Tooling changes (VS Code extension, CLI flags — open a PR)
- Performance improvements that don't change semantics (open a PR)

If you're unsure, open a GitHub Discussion with the tag `pre-AEP` to get feedback before writing the full proposal.

## AEP Template

Create a new file: `foundation/aeps/AEP-NNNN-short-title.md`

Use the next available number. Check existing AEPs for the latest.

```markdown
# AEP-NNNN: [Title]

**Author:** [Name] <[email]>
**Status:** Draft
**Created:** [YYYY-MM-DD]
**Updated:** [YYYY-MM-DD]
**Discussion:** [link to GitHub Discussion]

## Summary

One paragraph: what is the change and why?

## Motivation

Why does this change need to exist? What problem does it solve?
Include concrete examples of code that is hard or impossible to write today.

### User Story

As a [type of developer], I want to [do something] so that [benefit].

## Specification

### Syntax

\`\`\`ebnf
new_construct = ... ;
\`\`\`

### Semantics

Precise description of what the new feature does.

### Type System Impact

How does this interact with existing types, nullable types, constraints?

### Compilation Strategy

How does this compile to each target?

| Target | Strategy |
|--------|----------|
| Python | ... |
| LLVM | ... |
| WASM | ... |
| JVM | ... |

## Examples

At least 3 complete, runnable code examples.

\`\`\`
// Example 1: Basic usage
\`\`\`

\`\`\`
// Example 2: Edge case
\`\`\`

\`\`\`
// Example 3: Real-world application
\`\`\`

## Reference Implementation

Link to a branch with a working implementation, or describe implementation steps:
1. Lexer changes
2. Parser changes
3. Type checker changes
4. Emitter changes
5. Test cases

## Alternatives Considered

### Alternative A: [name]
Description and why it was rejected.

### Alternative B: [name]
Description and why it was rejected.

## Backwards Compatibility

- Does this break existing programs? [yes/no]
- If yes, what is the migration path?
- Deprecation timeline?

## Drawbacks

Why might we NOT want to do this?

## Prior Art

How do other languages handle this?

| Language | Approach |
|----------|----------|
| Rust | ... |
| Kotlin | ... |
| Swift | ... |

## Unresolved Questions

What needs further discussion before this can be finalized?
```

## Lifecycle

### 1. Draft

- Author writes the AEP following the template above
- Author opens a **GitHub Discussion** with the tag `AEP` and title `AEP: [Title]`
- Author links the discussion in the AEP document
- Community members provide initial feedback

### 2. Pre-Review

- A Core Team member reviews the AEP for completeness (all template sections filled)
- If incomplete, the author is asked to revise before formal review begins
- Core Team assigns an AEP number

### 3. Under Review

- The Core Team moves the AEP to "Under Review" status
- A **14-day public comment period** begins
- The comment period is announced in GitHub Discussions and the project's communication channels
- Anyone can comment — technical feedback, use cases, concerns, alternatives
- The author responds to comments and may revise the AEP during this period

### 4. Core Team Vote

- After the comment period closes, the Core Team has **30 days** to vote
- Spec-level changes (new syntax, type system, breaking changes): **4/5 required**
- Other changes (stdlib, tooling standards): **3/5 required**
- Each Core Team member posts their vote publicly with rationale
- During BDFL period (Year 1): Tyler Walker can veto any decision

### 5. Decision

**Accepted:**
- The AEP is merged into `foundation/aeps/` with its assigned number
- An implementation timeline is added to the AEP
- The feature is added to the project roadmap
- A tracking issue is created

**Rejected:**
- The AEP is closed with a written explanation from the Core Team
- The author may revise and resubmit after 60 days
- Rejection is not permanent — circumstances and priorities change

**Withdrawn:**
- The author may withdraw at any time
- Withdrawn AEPs are archived, not deleted

## Timeline Summary

| Event | Deadline |
|-------|----------|
| Core Team acknowledges new AEP | 7 days |
| Completeness review | 14 days |
| Public comment period | 14 days (minimum) |
| Core Team vote | 30 days after comment period closes |
| Implementation (if accepted) | Set in acceptance decision |

## Roles

| Role | Responsibility |
|------|---------------|
| **Author** | Writes the AEP, responds to feedback, provides reference implementation |
| **Core Team Sponsor** | A Core Team member who shepherds the AEP through the process |
| **Reviewers** | Community members who provide technical feedback |
| **Core Team** | Makes the binding decision |

## FAQ

**Can I submit an AEP without a reference implementation?**
Yes, but AEPs with implementations are much more likely to be accepted. "Show me the code" is a strong argument.

**What if my AEP is rejected?**
Read the rationale. You can revise and resubmit after 60 days. Many successful features started as rejected proposals that were improved through feedback.

**Can corporate members fast-track AEPs?**
No. Corporate membership provides roadmap input, not language design control. All AEPs follow the same process.

**What if two AEPs conflict?**
The Core Team evaluates both against AEP-0001 (Design Philosophy) and the project roadmap. One may be accepted, both may be modified, or both may be rejected.
