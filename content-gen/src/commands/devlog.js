/**
 * Command: apogee-content-gen devlog --week [N]
 *
 * Generates the weekly devlog from git history.
 */
import { generate } from "../lib/claude.js";
import { getLocalGitLog, getLocalDiffStats } from "../lib/github.js";
import { writeContent, today } from "../lib/output.js";
import { DEVLOG_SYSTEM } from "../lib/prompts.js";

export async function runDevlog(weekNumber) {
  const repoPath = new URL("../../..", import.meta.url).pathname;

  console.log("Reading git history...");
  const gitLog = await getLocalGitLog(repoPath, 7);
  const diffStats = await getLocalDiffStats(repoPath, 7);

  if (!gitLog.trim()) {
    console.warn("No git commits found in the past 7 days.");
  }

  const week = weekNumber || Math.ceil(
    (Date.now() - new Date("2026-04-01").getTime()) / (7 * 24 * 60 * 60 * 1000)
  );

  console.log(`Generating devlog for Week ${week}...`);

  // Generate main devlog
  const devlog = await generate(
    DEVLOG_SYSTEM,
    `Write the Apogee weekly devlog for Week ${week} (${today()}).

Git log from the past 7 days:
\`\`\`
${gitLog || "(no commits this week)"}
\`\`\`

Diff stats:
\`\`\`
${diffStats || "(no stats available)"}
\`\`\`

Structure:
1. Title: "Apogee Devlog — Week ${week}"
2. One-paragraph summary of the week
3. "What We Built" — describe each significant change, grouped by area (compiler, playground, docs, etc.)
4. "Decisions Made" — explain any design decisions with reasoning
5. "Problems & Solutions" — anything tricky that came up
6. "By the Numbers" — commits, files changed, lines added/removed
7. "Next Week" — what's planned
8. Sign-off

Include frontmatter with title, date, week number.
Tone: honest, technical, enthusiastic without being fake.`,
    4096
  );

  const filename = `${today()}-week-${week}.md`;
  const path = writeContent("devlogs", filename, devlog);
  console.log(`Devlog: ${path}`);

  // Generate social versions
  console.log("Generating social media versions...");

  const socialPrompt = `Convert this devlog into two versions:

=== TWITTER VERSION ===
A 5-tweet thread summarizing the week. Technical, concise, with 1-2 code snippets. End with link to full devlog.

=== LINKEDIN VERSION ===
A single LinkedIn post (200-400 words). Professional, highlights the most interesting technical decision. End with link to apogee-lang.dev.

Devlog:
${devlog.slice(0, 4000)}`;

  const social = await generate(DEVLOG_SYSTEM, socialPrompt, 2048);

  const socialFile = `${today()}-week-${week}-social.md`;
  const socialPath = writeContent("devlogs", socialFile, social);
  console.log(`Social versions: ${socialPath}`);

  return { path, socialPath, week };
}
