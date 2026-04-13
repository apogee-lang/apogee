/**
 * Command: apogee-content-gen tutorial --topic [topic]
 *
 * Generates a complete tutorial article (1500-2500 words, 10+ code examples).
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { generate } from "../lib/claude.js";
import { writeContent, today, slugify } from "../lib/output.js";
import { TUTORIAL_SYSTEM, TUTORIAL_TOPICS } from "../lib/prompts.js";

const STATE_FILE = new URL("../../.tutorial-state.json", import.meta.url).pathname;

/**
 * Get the next topic in rotation.
 */
function getNextTopic(requestedTopic) {
  if (requestedTopic) {
    const match = TUTORIAL_TOPICS.find(
      (t) => t.slug === requestedTopic || t.title.toLowerCase().includes(requestedTopic.toLowerCase())
    );
    if (match) return match;
    console.warn(`Topic "${requestedTopic}" not found. Using next in rotation.`);
  }

  let lastIndex = -1;
  if (existsSync(STATE_FILE)) {
    try {
      const state = JSON.parse(readFileSync(STATE_FILE, "utf-8"));
      lastIndex = state.lastTopicIndex ?? -1;
    } catch {
      // ignore
    }
  }

  const nextIndex = (lastIndex + 1) % TUTORIAL_TOPICS.length;

  // Save state
  const { writeFileSync } = await import("fs");
  writeFileSync(STATE_FILE, JSON.stringify({ lastTopicIndex: nextIndex }), "utf-8");

  return TUTORIAL_TOPICS[nextIndex];
}

export async function runTutorial(topic) {
  const selected = await getNextTopic(topic);
  console.log(`Generating tutorial: "${selected.title}"...`);

  const article = await generate(
    TUTORIAL_SYSTEM,
    `${selected.prompt}

Requirements:
- 1500-2500 words
- At least 10 complete, runnable Apogee code examples
- Include a "vs Python" comparison showing equivalent Python code
- Include a "Common Mistakes" section with compiler errors and fixes
- End with "What You Learned" summary and "Try It Yourself" exercises
- Include frontmatter: title, date (${today()}), tags, description
- All Apogee code must be syntactically correct and use proper features

Title: "${selected.title}"`,
    8192
  );

  const filename = `${today()}-${selected.slug}.md`;
  const path = writeContent("tutorials", filename, article);
  console.log(`Tutorial written: ${path}`);
  console.log(`Topic: ${selected.title}`);

  return { path, topic: selected };
}
