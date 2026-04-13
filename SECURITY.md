# Security Policy

## Reporting a Vulnerability

**Do not open a public issue.** Security vulnerabilities must be reported privately.

**Email:** security@apogee-lang.dev

**PGP key:** Available at [https://apogee-lang.dev/.well-known/security.txt](https://apogee-lang.dev/.well-known/security.txt)

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Affected versions
- Potential impact assessment
- Suggested fix (if you have one)

### What Qualifies

- Compiler bugs that produce unsafe code (e.g., bypassing null safety)
- Sandbox escapes in the playground or MCP server
- Supply chain vulnerabilities in dependencies
- Vulnerabilities in the build/release pipeline
- Denial of service in the compiler (e.g., infinite loops on malformed input)

### What Does Not Qualify

- Bugs that cause compiler crashes (not a security issue — report as a regular bug)
- Missing features
- Performance issues
- Cosmetic issues in error messages

## Response Commitments

| Stage | Timeline |
|-------|----------|
| Acknowledgement | Within **48 hours** of report |
| Initial assessment (severity, scope) | Within **7 days** |
| Fix developed and tested | Within **30 days** for critical/high; **90 days** for medium/low |
| Public disclosure | After fix is released, coordinated with reporter |

### Severity Levels

| Level | Description | Response |
|-------|-------------|----------|
| **Critical** | Compiler produces code that bypasses safety guarantees | Emergency patch within 7 days |
| **High** | Sandbox escape, supply chain compromise | Patch within 14 days |
| **Medium** | Denial of service, information disclosure | Patch within 30 days |
| **Low** | Minor issues with limited impact | Patch within 90 days |

## CVE Process

For vulnerabilities rated High or Critical:

1. A CVE ID is requested from a CVE Numbering Authority
2. The fix is developed privately
3. A patched version is released
4. The CVE is published with full details after users have had 7 days to update
5. The reporter is credited (unless they request anonymity)

## Security Audit Schedule

The Apogee compiler and its sandbox execution environment undergo a security review:

- **Annually:** Full audit by an independent security firm
- **Per release:** Internal review of all changes touching: the emitter, the sandbox, the MCP server, and dependency updates
- **Continuously:** Dependabot and similar tools monitor for known vulnerabilities in dependencies

## Disclosure Policy

We follow coordinated disclosure:

1. Reporter contacts us privately
2. We acknowledge, assess, and develop a fix
3. We coordinate a disclosure date with the reporter
4. The fix is released before or simultaneously with the disclosure
5. The reporter is credited in the security advisory

We do not pursue legal action against security researchers who follow this policy.

## Scope

This policy covers:

- The Apogee compiler (`src/`)
- The browser playground (`play/`)
- The MCP server (`mcp-server/`)
- The VS Code extension (`vscode-extension/`)
- The content generation pipeline (`content-gen/`)
- Infrastructure (CI/CD, deployment, DNS)

## Contact

**Email:** security@apogee-lang.dev
**Response guarantee:** 48 hours
