/**
 * Claude API client with rate limiting, retries, and cost tracking.
 */
import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-20250514";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const RATE_LIMIT_DELAY_MS = 60_000;

// Cost per million tokens (approximate, Sonnet 4)
const INPUT_COST_PER_M = 3.0;
const OUTPUT_COST_PER_M = 15.0;

let totalInputTokens = 0;
let totalOutputTokens = 0;
let totalRequests = 0;

const client = new Anthropic();

/**
 * Send a prompt to Claude with retry logic and cost tracking.
 * @param {string} system - System prompt
 * @param {string} userMessage - User message
 * @param {number} maxTokens - Max output tokens
 * @returns {Promise<string>} - Claude's response text
 */
export async function generate(system, userMessage, maxTokens = 4096) {
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: userMessage }],
      });

      // Track usage
      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;
      totalRequests++;

      const text = response.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("");

      return text;
    } catch (err) {
      lastError = err;

      if (err.status === 429) {
        console.error(
          `  Rate limited (attempt ${attempt}/${MAX_RETRIES}). Waiting ${RATE_LIMIT_DELAY_MS / 1000}s...`
        );
        await sleep(RATE_LIMIT_DELAY_MS);
      } else if (err.status === 529 || err.status >= 500) {
        console.error(
          `  Server error ${err.status} (attempt ${attempt}/${MAX_RETRIES}). Retrying in ${RETRY_DELAY_MS / 1000}s...`
        );
        await sleep(RETRY_DELAY_MS * attempt);
      } else {
        throw err;
      }
    }
  }

  throw new Error(
    `Claude API failed after ${MAX_RETRIES} attempts: ${lastError?.message || "unknown error"}`
  );
}

/**
 * Get cost tracking summary.
 */
export function getCostSummary() {
  const inputCost = (totalInputTokens / 1_000_000) * INPUT_COST_PER_M;
  const outputCost = (totalOutputTokens / 1_000_000) * OUTPUT_COST_PER_M;
  return {
    requests: totalRequests,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    totalTokens: totalInputTokens + totalOutputTokens,
    estimatedCost: `$${(inputCost + outputCost).toFixed(4)}`,
  };
}

export function resetCosts() {
  totalInputTokens = 0;
  totalOutputTokens = 0;
  totalRequests = 0;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
