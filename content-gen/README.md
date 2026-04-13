# apogee-content-gen

Automated content generation pipeline for the Apogee programming language. Uses Claude API to generate blog posts, tutorials, devlogs, social media content, and training corpus examples.

## Setup

```bash
cd content-gen
npm install
export ANTHROPIC_API_KEY=your-key
export GITHUB_TOKEN=your-token  # optional, increases rate limit
```

## Commands

### Comparison Post
```bash
apogee-content-gen comparison --source python
```
Finds a trending Python repo, transpiles key functions to Apogee, generates a comparison blog post + Twitter thread + LinkedIn post.

### Tutorial
```bash
apogee-content-gen tutorial --topic null-safety
apogee-content-gen tutorial   # next in rotation
```
Generates a 1500-2500 word tutorial with 10+ code examples. Topics rotate automatically.

### Devlog
```bash
apogee-content-gen devlog --week 2
```
Generates weekly devlog from git history + social media versions.

### Show HN Post
```bash
apogee-content-gen hn-post
```
Generates Show HN post + r/ProgrammingLanguages version + posting guide.

### Training Corpus
```bash
apogee-content-gen corpus --count 50
```
Generates N complete .apg programs with matching .py equivalents.

## Automation

The GitHub Actions workflow (`.github/workflows/content-weekly.yml`) runs every Monday at 8am EST:
1. Generates comparison + tutorial + corpus + devlog
2. Commits to a branch
3. Opens a PR for review
4. Sends a Discord notification

## Cost Tracking

Every run prints token usage and estimated cost at the end:
```
Completed in 45.2s
API calls: 7 | Tokens: 28,431 | Cost: $0.0412
```
