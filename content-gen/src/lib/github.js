/**
 * GitHub API helpers — find trending repos, fetch code, get git log.
 */

const GITHUB_API = "https://api.github.com";

function headers() {
  const h = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "apogee-content-gen",
  };
  if (process.env.GITHUB_TOKEN) {
    h.Authorization = `token ${process.env.GITHUB_TOKEN}`;
  }
  return h;
}

/**
 * Find trending Python repos from the past week.
 * @param {number} count - Number of repos to return
 * @returns {Promise<Array<{name: string, full_name: string, description: string, stars: number, url: string}>>}
 */
export async function findTrendingPythonRepos(count = 5) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const url = `${GITHUB_API}/search/repositories?q=language:python+created:>${since}&sort=stars&order=desc&per_page=${count}`;

  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.items.map((repo) => ({
    name: repo.name,
    full_name: repo.full_name,
    description: repo.description || "",
    stars: repo.stargazers_count,
    url: repo.html_url,
    language: repo.language,
  }));
}

/**
 * Fetch a Python file from a repo.
 * @param {string} fullName - owner/repo
 * @param {string} path - file path
 * @returns {Promise<string>} - file content
 */
export async function fetchFile(fullName, path) {
  const url = `${GITHUB_API}/repos/${fullName}/contents/${path}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) return null;

  const data = await res.json();
  if (data.encoding === "base64") {
    return Buffer.from(data.content, "base64").toString("utf-8");
  }
  return data.content || null;
}

/**
 * Find Python files in a repo's root and common directories.
 * @param {string} fullName - owner/repo
 * @returns {Promise<string[]>} - list of .py file paths
 */
export async function findPythonFiles(fullName) {
  const paths = ["", "src", "app", "lib"];
  const pyFiles = [];

  for (const dir of paths) {
    const url = `${GITHUB_API}/repos/${fullName}/contents/${dir}`;
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) continue;

    const items = await res.json();
    if (!Array.isArray(items)) continue;

    for (const item of items) {
      if (item.type === "file" && item.name.endsWith(".py") && item.size < 10000) {
        pyFiles.push(item.path);
      }
    }
  }
  return pyFiles;
}

/**
 * Get git log for the past N days from local repo.
 * @param {string} repoPath - path to git repo
 * @param {number} days - number of days
 * @returns {Promise<string>} - git log output
 */
export async function getLocalGitLog(repoPath, days = 7) {
  const { execSync } = await import("child_process");
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    return execSync(
      `git -C "${repoPath}" log --since="${since}" --pretty=format:"%h %s (%an, %ar)" --no-merges`,
      { encoding: "utf-8", timeout: 10000 }
    );
  } catch {
    return "";
  }
}

/**
 * Get diff stats for the past N days.
 * @param {string} repoPath
 * @param {number} days
 * @returns {Promise<string>}
 */
export async function getLocalDiffStats(repoPath, days = 7) {
  const { execSync } = await import("child_process");
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    return execSync(
      `git -C "${repoPath}" diff --stat "$(git -C "${repoPath}" log --since="${since}" --pretty=format:"%H" | tail -1)" HEAD`,
      { encoding: "utf-8", timeout: 10000 }
    );
  } catch {
    return "";
  }
}
