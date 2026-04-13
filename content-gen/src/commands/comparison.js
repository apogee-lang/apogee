/**
 * Command: apogee-content-gen comparison --source python
 *
 * Finds a trending Python repo, transpiles key functions to Apogee,
 * and generates a comparison blog post + social media versions.
 */
import { generate } from "../lib/claude.js";
import { findTrendingPythonRepos, findPythonFiles, fetchFile } from "../lib/github.js";
import { writeContent, today, slugify } from "../lib/output.js";
import { COMPARISON_SYSTEM } from "../lib/prompts.js";

export async function runComparison(source = "python") {
  console.log(`Finding trending ${source} repos...`);

  const repos = await findTrendingPythonRepos(5);
  if (!repos.length) {
    console.error("No trending repos found. Check your GITHUB_TOKEN.");
    return;
  }

  // Pick the top repo
  const repo = repos[0];
  console.log(
    `Selected: ${repo.full_name} (${repo.stars} stars) — ${repo.description}`
  );

  // Fetch some Python files
  console.log("Fetching Python source files...");
  const pyFiles = await findPythonFiles(repo.full_name);
  const filesToAnalyze = pyFiles.slice(0, 3);

  let pythonCode = "";
  for (const path of filesToAnalyze) {
    const content = await fetchFile(repo.full_name, path);
    if (content) {
      pythonCode += `\n# --- ${path} ---\n${content.slice(0, 2000)}\n`;
    }
  }

  if (!pythonCode.trim()) {
    pythonCode = `# No Python files found in ${repo.full_name} root\n# Using project description for comparison\n`;
  }

  // Generate comparison blog post
  console.log("Generating comparison blog post...");
  const blogPost = await generate(
    COMPARISON_SYSTEM,
    `Write a comparison blog post about the Python project "${repo.name}" (${repo.full_name}).

Project description: ${repo.description}
GitHub URL: ${repo.url}
Stars: ${repo.stars}

Here is sample Python code from the project:
\`\`\`python
${pythonCode.slice(0, 3000)}
\`\`\`

Structure:
1. Title: "I rewrote [key parts of] ${repo.name} in Apogee — here's what the compiler caught"
2. Brief intro to the project and why it's interesting
3. 3-4 side-by-side code comparison sections (Python vs Apogee)
4. List of specific compile-time errors Apogee catches vs Python runtime errors
5. What Apogee's guarantees mean for this kind of project
6. Honest limitations — what Apogee can't do yet
7. Conclusion

Include frontmatter with title, date, tags, and description.
Make all Apogee code realistic and correct. Python code should be realistic too.`,
    8192
  );

  const blogSlug = slugify(repo.name);
  const blogFile = `${today()}-${blogSlug}.md`;
  const blogPath = writeContent("comparisons", blogFile, blogPost);
  console.log(`Blog post: ${blogPath}`);

  // Generate Twitter thread
  console.log("Generating Twitter thread...");
  const twitterThread = await generate(
    COMPARISON_SYSTEM,
    `Convert this blog post into a Twitter/X thread of exactly 20 tweets. Each tweet under 280 characters. Use emojis sparingly. Include code snippets in tweets where impactful. Thread should tell a story that makes developers curious about Apogee.

First tweet should be a hook. Last tweet should link to apogee-lang.dev.

Number each tweet: 1/20, 2/20, etc.

Blog post to convert:
${blogPost.slice(0, 6000)}`,
    4096
  );

  const twitterFile = `${today()}-${blogSlug}-twitter.md`;
  const twitterPath = writeContent("comparisons", twitterFile, twitterThread);
  console.log(`Twitter thread: ${twitterPath}`);

  // Generate LinkedIn post
  console.log("Generating LinkedIn post...");
  const linkedinPost = await generate(
    COMPARISON_SYSTEM,
    `Convert this blog post into a single LinkedIn post (600-800 words). Professional but not corporate. Technical but accessible to engineering managers. Include a few code snippets. End with a call to try Apogee at apogee-lang.dev.

Blog post to convert:
${blogPost.slice(0, 6000)}`,
    2048
  );

  const linkedinFile = `${today()}-${blogSlug}-linkedin.md`;
  const linkedinPath = writeContent("comparisons", linkedinFile, linkedinPost);
  console.log(`LinkedIn post: ${linkedinPath}`);

  return { blogPath, twitterPath, linkedinPath, repo };
}
