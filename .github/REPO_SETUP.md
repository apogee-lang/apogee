# GitHub Repository Setup

Run these commands after creating the repo at `github.com/apogee-lang/apogee`:

```bash
# Set description and metadata
gh repo edit apogee-lang/apogee \
  --description "The programming language built for the AI era. Compile-time safety. Intent verification. Runs everywhere." \
  --homepage "https://apogee-lang.dev" \
  --add-topic programming-language \
  --add-topic compiler \
  --add-topic ai \
  --add-topic type-safety \
  --add-topic apogee \
  --add-topic transpiler \
  --add-topic python \
  --enable-discussions \
  --enable-issues \
  --enable-wiki=false

# Create labels for issue triage
gh label create "language-design" --description "Spec-level language design discussions" --color "5319e7"
gh label create "compiler" --description "Lexer, parser, typechecker, emitter" --color "0052cc"
gh label create "stdlib" --description "Standard library modules" --color "006b75"
gh label create "cli" --description "Command-line interface" --color "e4e669"
gh label create "triage" --description "Needs triage" --color "d93f0b"
gh label create "good first issue" --description "Good for newcomers" --color "7057ff"
gh label create "breaking-change" --description "Introduces breaking changes" --color "b60205"
gh label create "performance" --description "Performance improvements" --color "f9d0c4"

# Create milestones
gh api repos/apogee-lang/apogee/milestones -f title="Phase 1: Python Transpiler" \
  -f description="Bootstrap compiler — Apogee to Python 3.11+ transpiler" -f state="open"
gh api repos/apogee-lang/apogee/milestones -f title="Phase 2: LLVM Backend" \
  -f description="Native compilation via LLVM IR" -f state="open"
gh api repos/apogee-lang/apogee/milestones -f title="Phase 3: WebAssembly" \
  -f description="WASM target for browser and edge runtimes" -f state="open"
gh api repos/apogee-lang/apogee/milestones -f title="Phase 4: JVM" \
  -f description="JVM bytecode target for enterprise and Android" -f state="open"

# Set up branch protection for main
gh api repos/apogee-lang/apogee/branches/main/protection -X PUT \
  -F "required_status_checks[strict]=true" \
  -F "required_status_checks[contexts][]=All Checks Pass" \
  -F "enforce_admins=false" \
  -F "required_pull_request_reviews[required_approving_review_count]=1" \
  -F "restrictions=null"

# Create discussion categories
gh api repos/apogee-lang/apogee/discussions/categories -f name="Announcements" \
  -f description="Official announcements" -f format="ANNOUNCEMENT"
gh api repos/apogee-lang/apogee/discussions/categories -f name="Language Design" \
  -f description="Discuss proposed language features" -f format="DISCUSSION"
gh api repos/apogee-lang/apogee/discussions/categories -f name="Show and Tell" \
  -f description="Share what you've built with Apogee" -f format="DISCUSSION"
gh api repos/apogee-lang/apogee/discussions/categories -f name="Q&A" \
  -f description="Ask questions and get answers" -f format="QUESTION_ANSWER"
```
