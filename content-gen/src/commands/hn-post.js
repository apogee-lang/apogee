/**
 * Command: apogee-content-gen hn-post
 *
 * Generates a Show HN post and r/ProgrammingLanguages version.
 */
import { generate } from "../lib/claude.js";
import { writeContent, today } from "../lib/output.js";
import { HN_SYSTEM } from "../lib/prompts.js";

export async function runHNPost() {
  console.log("Generating Show HN post...");

  const hnPost = await generate(
    HN_SYSTEM,
    `Write a "Show HN" post for Apogee.

The post has two parts:

PART 1 — HN TITLE (one line):
Show HN: Apogee – [compelling subtitle under 80 chars total]

PART 2 — HN COMMENT (the launch comment, 300-500 words):
Structure:
- What Apogee is (one sentence)
- Why it exists (the problem, 2-3 sentences)
- What works today (be specific — compile, run, check, playground)
- A concrete code example showing the key value prop (type safety + @intent)
- Honest limitations (Python backend only, no package manager yet, etc.)
- What's next (LLVM backend, WASM, etc.)
- Links: GitHub, playground, book

Rules:
- No marketing language. HN will destroy you for "revolutionary" or "game-changing."
- Lead with the technical substance.
- Be honest about what doesn't work yet.
- Show, don't tell — include actual Apogee code.
- The goal is to make technical people curious enough to click the link.

Optimal posting time: Tuesday-Thursday, 9am EST (note this in the metadata).`,
    4096
  );

  const hnPath = writeContent("hn", `${today()}-show-hn.md`, hnPost);
  console.log(`Show HN post: ${hnPath}`);

  // Generate r/ProgrammingLanguages version
  console.log("Generating r/ProgrammingLanguages post...");

  const redditPost = await generate(
    HN_SYSTEM,
    `Write a post for r/ProgrammingLanguages about Apogee.

This audience is deeply technical — they know about type theory, language design, compiler construction. They've seen hundreds of "new language" posts and are skeptical.

Structure:
- Title: descriptive, not clickbait
- Body (400-600 words):
  * What makes Apogee's type system interesting (constraint types, null safety)
  * The @intent annotation system and why it's novel
  * Compilation strategy (AST → Python, future LLVM)
  * The structured concurrency model
  * Honest comparison to prior art (Rust's ownership, Kotlin's null safety, LINQ's queries)
  * What you'd like feedback on from the PL community
  * Links

Be humble. This community knows more about language design than you do. Ask questions. Invite criticism. Show technical depth.`,
    4096
  );

  const redditPath = writeContent("hn", `${today()}-r-programminglanguages.md`, redditPost);
  console.log(`Reddit post: ${redditPath}`);

  // Generate posting guide
  const guide = `# Posting Guide — ${today()}

## Show HN
- **When to post**: Tuesday-Thursday, 9:00 AM EST
- **URL to submit**: https://apogee-lang.dev
- **File**: ${hnPath}
- **After posting**: Reply to your own post with the launch comment

## r/ProgrammingLanguages
- **When to post**: Same day as HN, a few hours later
- **File**: ${redditPath}
- **Flair**: "Language announcement" or "Discussion"

## Engagement strategy
- Be online for 2 hours after posting to respond to comments
- Honest, technical responses only
- If someone finds a bug, acknowledge it and file an issue
- Don't argue — explain and thank
`;

  const guidePath = writeContent("hn", `${today()}-posting-guide.md`, guide);
  console.log(`Posting guide: ${guidePath}`);

  return { hnPath, redditPath, guidePath };
}
