#!/usr/bin/env node

/**
 * apogee-content-gen — Automated content generation for the Apogee language.
 *
 * Commands:
 *   comparison --source python    Generate "Rewrote X in Apogee" comparison post
 *   tutorial [--topic <topic>]    Generate a tutorial article
 *   devlog [--week <N>]          Generate weekly devlog
 *   hn-post                       Generate Show HN + Reddit posts
 *   corpus [--count <N>]          Generate .apg training corpus examples
 */

import { getCostSummary, resetCosts } from "./lib/claude.js";

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

function printUsage() {
  console.log(`
${BOLD}apogee-content-gen${RESET} — Automated content pipeline for Apogee

${CYAN}Commands:${RESET}
  comparison --source python    Generate comparison blog post + social
  tutorial [--topic <slug>]     Generate tutorial article (rotates topics)
  devlog [--week <N>]           Generate weekly devlog from git history
  hn-post                       Generate Show HN + r/ProgrammingLanguages posts
  corpus [--count <N>]          Generate .apg code examples (default: 10)

${CYAN}Environment:${RESET}
  ANTHROPIC_API_KEY             Required. Claude API key.
  GITHUB_TOKEN                  Optional. Increases GitHub API rate limit.

${CYAN}Examples:${RESET}
  apogee-content-gen comparison --source python
  apogee-content-gen tutorial --topic null-safety
  apogee-content-gen tutorial                        # next in rotation
  apogee-content-gen devlog --week 2
  apogee-content-gen hn-post
  apogee-content-gen corpus --count 50
`);
}

function parseArgs(args) {
  const result = { command: null, flags: {} };
  let i = 0;

  // First non-flag arg is the command
  if (args.length > 0 && !args[0].startsWith("-")) {
    result.command = args[0];
    i = 1;
  }

  // Parse flags
  while (i < args.length) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("-")) {
        result.flags[key] = next;
        i += 2;
      } else {
        result.flags[key] = true;
        i++;
      }
    } else {
      i++;
    }
  }

  return result;
}

async function main() {
  const { command, flags } = parseArgs(process.argv.slice(2));

  if (!command || flags.help) {
    printUsage();
    process.exit(command ? 0 : 1);
  }

  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(`${RED}Error:${RESET} ANTHROPIC_API_KEY environment variable is required.`);
    console.error(`${DIM}Get one at: https://console.anthropic.com/settings/keys${RESET}`);
    process.exit(1);
  }

  resetCosts();
  const startTime = Date.now();

  console.log(`${BOLD}${GREEN}apogee-content-gen${RESET} ${DIM}${command}${RESET}\n`);

  try {
    switch (command) {
      case "comparison": {
        const { runComparison } = await import("./commands/comparison.js");
        await runComparison(flags.source || "python");
        break;
      }
      case "tutorial": {
        const { runTutorial } = await import("./commands/tutorial.js");
        await runTutorial(flags.topic);
        break;
      }
      case "devlog": {
        const { runDevlog } = await import("./commands/devlog.js");
        await runDevlog(flags.week ? parseInt(flags.week) : undefined);
        break;
      }
      case "hn-post": {
        const { runHNPost } = await import("./commands/hn-post.js");
        await runHNPost();
        break;
      }
      case "corpus": {
        const { runCorpus } = await import("./commands/corpus.js");
        await runCorpus(flags.count ? parseInt(flags.count) : 10);
        break;
      }
      default:
        console.error(`${RED}Unknown command:${RESET} ${command}`);
        printUsage();
        process.exit(1);
    }
  } catch (err) {
    console.error(`\n${RED}Error:${RESET} ${err.message}`);
    if (err.status) {
      console.error(`${DIM}HTTP status: ${err.status}${RESET}`);
    }
    process.exit(1);
  }

  // Print cost summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const costs = getCostSummary();

  console.log(`\n${DIM}─────────────────────────────────────${RESET}`);
  console.log(`${DIM}Completed in ${elapsed}s${RESET}`);
  console.log(`${DIM}API calls: ${costs.requests} | Tokens: ${costs.totalTokens.toLocaleString()} | Cost: ${costs.estimatedCost}${RESET}`);
}

main();
