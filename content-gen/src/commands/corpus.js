/**
 * Command: apogee-content-gen corpus --count N
 *
 * Generates N complete .apg programs with matching .py equivalents.
 */
import { generate } from "../lib/claude.js";
import { writeCorpusPair } from "../lib/output.js";
import { CORPUS_SYSTEM, APOGEE_CONTEXT, CORPUS_CATEGORIES } from "../lib/prompts.js";

export async function runCorpus(count = 10) {
  console.log(`Generating ${count} corpus examples...`);
  const paths = [];

  for (let i = 1; i <= count; i++) {
    const category = CORPUS_CATEGORIES[(i - 1) % CORPUS_CATEGORIES.length];
    const variant = Math.ceil(i / CORPUS_CATEGORIES.length);

    console.log(`  [${i}/${count}] ${category.name} (variant ${variant})...`);

    // Generate Apogee code
    const apgCode = await generate(
      CORPUS_SYSTEM,
      `${category.prompt}

This is variant ${variant} — make it different from other examples in the same category. Be creative with the domain (e-commerce, healthcare, logistics, social media, IoT, finance, education, etc.).

Output ONLY the .apg source code. No markdown fences, no prose. Start with a // comment describing the program.`,
      2048
    );

    // Generate matching Python
    const pyCode = await generate(
      `${APOGEE_CONTEXT}\n\nYou are generating the Python equivalent of an Apogee program. Output ONLY Python code. No markdown fences, no prose.`,
      `Convert this Apogee program to idiomatic Python 3.11+. Preserve the same logic and structure. Add type hints and dataclasses. Include a comment at the top: "# Python equivalent of ${category.name}_${String(i).padStart(3, "0")}.apg"

Apogee code:
${apgCode}`,
      2048
    );

    const [apgPath, pyPath] = writeCorpusPair(i, apgCode.trim() + "\n", pyCode.trim() + "\n", category.name);
    paths.push({ apgPath, pyPath });

    // Brief delay between requests to be respectful of rate limits
    if (i < count) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log(`Generated ${count} corpus pairs in content/corpus/examples/`);
  return paths;
}
