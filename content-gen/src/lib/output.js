/**
 * File output helpers — write content to the right directories.
 */
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";

const CONTENT_ROOT = new URL("../../content", import.meta.url).pathname;

/**
 * Write content to a file, creating directories as needed.
 * @param {string} subdir - e.g. "comparisons", "tutorials"
 * @param {string} filename - e.g. "2026-04-12-my-post.md"
 * @param {string} content - file content
 * @returns {string} - full path written
 */
export function writeContent(subdir, filename, content) {
  const dir = join(CONTENT_ROOT, subdir);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const fullPath = join(dir, filename);
  writeFileSync(fullPath, content, "utf-8");
  return fullPath;
}

/**
 * Write a corpus example (.apg + .py pair).
 * @param {number} index - example number
 * @param {string} apgCode - Apogee code
 * @param {string} pyCode - Python equivalent
 * @param {string} category - e.g. "web", "cli", "data"
 * @returns {string[]} - paths written
 */
export function writeCorpusPair(index, apgCode, pyCode, category) {
  const dir = join(CONTENT_ROOT, "corpus", "examples");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const prefix = String(index).padStart(3, "0");
  const apgPath = join(dir, `${prefix}_${category}.apg`);
  const pyPath = join(dir, `${prefix}_${category}.py`);

  writeFileSync(apgPath, apgCode, "utf-8");
  writeFileSync(pyPath, pyCode, "utf-8");
  return [apgPath, pyPath];
}

/**
 * Get today's date as YYYY-MM-DD.
 */
export function today() {
  return new Date().toISOString().split("T")[0];
}

/**
 * Slugify a string.
 */
export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}
