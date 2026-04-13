# Apogee Governance

This document describes how the Apogee programming language is governed — how decisions are made, who makes them, and how the community participates.

## Principles

1. **Decisions are public.** All language design decisions happen in public GitHub Discussions and Issues. No private mailing lists, no backroom deals.
2. **Code wins arguments.** A working reference implementation carries more weight than theoretical debate.
3. **The compiler is the spec.** If the spec and the compiler disagree, the spec is updated.
4. **Stability matters.** Breaking changes require an Apogee Enhancement Proposal (AEP), a public comment period, and a Core Team vote.

## Roles

### BDFL (Year 1 Only)

Tyler Walker holds Benevolent Dictator For Life authority for Apogee's first year (through April 2027). This means:

- Tyler can veto any AEP or Core Team decision during Year 1
- Tyler can fast-track decisions that would normally require the full AEP process
- This authority expires automatically on April 12, 2027
- After expiration, all decisions follow the standard Core Team process
- The BDFL clause cannot be renewed or extended

**Why this exists:** New languages need decisive leadership in their first year. Design consistency matters more than consensus when the foundation is being laid. After Year 1, the language is mature enough for community governance.

### Core Team

The Core Team makes binding decisions about the Apogee language, compiler, and standard library.

**Composition:** 5 members with staggered 2-year terms.

**Year 1 (appointed):**
- Tyler Walker (Project Lead, BDFL) — overall direction, compiler
- Seat 2 — stdlib and ecosystem
- Seat 3 — type system and language design
- Seat 4 — tooling (LSP, editor extensions, playground)
- Seat 5 — community and documentation

**Year 2+ (elected):** Core Team members are elected by active contributors. An "active contributor" is anyone who has had a PR merged in the past 12 months. Elections are held annually for expiring seats.

**Responsibilities:**
- Vote on Apogee Enhancement Proposals (AEPs)
- Review and approve spec changes
- Set release schedules
- Manage the project roadmap
- Resolve disputes

**Decision process:** Simple majority (3 of 5) for most decisions. Spec-level changes (new syntax, type system changes, breaking changes) require 4 of 5.

### Contributors

Anyone who submits a pull request, files an issue, or participates in Discussions is a contributor. Contributors can:

- Propose AEPs
- Vote in Core Team elections (if active)
- Participate in public comment periods
- Review pull requests

### Maintainers

Maintainers have merge access to the repository. They are nominated by the Core Team and approved by majority vote. Maintainers:

- Review and merge pull requests
- Triage issues
- Manage CI/CD and releases
- Enforce the code of conduct

## Apogee Enhancement Proposals (AEPs)

An AEP is the formal process for proposing changes to the Apogee language, its specification, or its standard library.

### When an AEP is Required

- Any new keyword or syntax
- Any change to the type system
- Any change to the memory or concurrency model
- Any breaking change to existing behavior
- Any new standard library module
- Any change to the compilation targets

### When an AEP is NOT Required

- Bug fixes
- Performance improvements that don't change semantics
- Documentation improvements
- Tooling changes (editor extensions, CLI flags)
- Test additions

### AEP Format

Every AEP must include:

```markdown
# AEP-NNNN: Title

**Author:** Name <email>
**Status:** Draft | Under Review | Accepted | Rejected | Withdrawn
**Created:** YYYY-MM-DD
**Updated:** YYYY-MM-DD

## Motivation

Why does this change need to exist? What problem does it solve?
Include concrete examples of code that is hard to write today.

## Specification

Precise description of the proposed change. Include:
- Syntax (EBNF grammar additions/changes)
- Semantics (what the new feature does)
- Type system implications
- Compilation strategy (how it maps to Python, LLVM, WASM, JVM)

## Examples

At least 3 complete, runnable code examples showing the feature in use.

## Reference Implementation

Link to a branch or PR with a working implementation, or a detailed
description of how to implement it.

## Alternatives Considered

What other approaches were evaluated? Why was this one chosen?

## Backwards Compatibility

Does this break existing .apg programs? If so, what is the migration path?

## Drawbacks

Why might we NOT want to do this?
```

### AEP Lifecycle

1. **Draft** — Author writes the AEP and opens a GitHub Discussion tagged `AEP`.
2. **Under Review** — Core Team moves the AEP to review status. A 14-day public comment period begins.
3. **Core Team Vote** — After the comment period, the Core Team votes. Spec-level changes require 4/5; other changes require 3/5.
4. **Accepted** — The AEP is numbered, merged into `foundation/aeps/`, and added to the implementation roadmap.
5. **Rejected** — The AEP is closed with a written explanation. Authors may revise and resubmit.
6. **Withdrawn** — The author withdraws the proposal.

### Timeline Commitments

- Core Team must acknowledge a new AEP within **7 days**
- Public comment period: **14 days minimum**
- Core Team vote: within **30 days** of comment period closing
- Implementation timeline: set at acceptance, published in the AEP

## Release Process

Apogee follows semantic versioning:

- **Patch** (0.1.x): Bug fixes, no behavior changes
- **Minor** (0.x.0): New features, backwards compatible
- **Major** (x.0.0): Breaking changes (requires AEP)

Releases are cut by maintainers and approved by at least one Core Team member.

## Code of Conduct

All participants in the Apogee project are expected to be respectful, constructive, and professional. We follow the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).

Violations are reported to conduct@apogee-lang.dev and reviewed by the Core Team.

## Amendments

This governance document can be amended by a 4/5 Core Team vote with a 14-day public comment period. The BDFL clause in this document cannot be extended.
