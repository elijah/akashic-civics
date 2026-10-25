# Contributing to Akashic Civics

Thank you for your interest in contributing! This project welcomes contributions from researchers, developers, and criminal justice practitioners.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR-USERNAME/akashic-civics.git`
3. Install dependencies: `npm ci`
4. Create a branch: `git checkout -b feature/your-feature-name`

## Development Workflow

### Code Standards

- TypeScript strict mode required
- ESLint + Prettier formatting
- All new code must have tests
- Mutation testing threshold: 50% minimum

### Testing Requirements

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run mutation tests
npm run test:mutation

# Run fuzz tests
npm run test:fuzz
```

### Commit Messages

Use conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Test additions
- `refactor:` Code restructuring
- `perf:` Performance improvements

### Pull Request Process

1. Ensure all tests pass
2. Update documentation if needed
3. Add entry to CHANGELOG.md (automated via standard-version)
4. Request review from CODEOWNERS
5. Address feedback

## Project Structure

```
src/
├── statistical/        # Statistical methods
├── accountability/     # Accountability tools
├── visualization/      # D3.js visualizations
├── cli/               # Command-line interface
├── documentation/      # Tutorials & guides
├── testing/           # Property/fuzz/mutation tests
└── index.ts           # Main exports
```

## Reporting Issues

Use the issue templates:
- Bug reports
- Feature requests
- Security vulnerabilities (private)

## Code of Conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.