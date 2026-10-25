# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.13.x  | :white_check_mark: |
| 1.12.x  | :x:                |
| < 1.12  | :x:                |

## Reporting a Vulnerability

**Do not report security vulnerabilities via public GitHub issues.**

Email: security@akashic-civics.org

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide a timeline for fix.

## Disclosure Policy

- We follow coordinated disclosure
- Security patches released within 30 days for critical issues
- CVE requested for confirmed vulnerabilities
- Public disclosure after patch release

## Security Features

- Input validation on all external data
- SQL injection prevention (parameterized queries)
- Path traversal protection
- Resource limits (max file size, execution time)
- No eval() or dynamic code execution
- Dependency scanning (npm audit, dependabot)

## Testing Security

```bash
npm run test:security
npm audit
```

## Known Limitations

- R script execution runs in sandboxed environment
- No authentication built-in (designed for offline use)
- File system access limited to configured directories