# Team Conventions

This document records team working agreements and conventions that all contributors — human and agent — are expected to follow.

## Merge Policy

All pull requests must pass the full CI check suite before merging. This includes:

- Typecheck (`pnpm typecheck`)
- Lint (`pnpm lint`)
- Build (`pnpm build`)
- Tests (`pnpm test`)
- Smoke tests (`pnpm smoke`)

**Do not merge if any check is failing.** If CI fails:

1. Investigate the root cause from the CI logs
2. Push a fix to the branch
3. Wait for the next CI run to complete and pass
4. Only then merge

This policy applies to all contributors, including automated agents.

## CI Checklist

Before merging a PR, verify:

- [ ] All CI checks are green
- [ ] Code has been reviewed (for human contributions)
- [ ] Branch is up to date with `main`
- [ ] No secrets or credentials are committed
- [ ] `.env` files are not committed (only `.env.example` with placeholders)

## Branch Naming

- Feature branches: `dev` or descriptive names
- Keep branches focused on a single issue or feature

## Commit Messages

Follow conventional commits where practical:

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `test:` for test additions or changes
- `refactor:` for code refactoring
- `ci:` for CI/CD changes

## Environment and Secrets

- Never commit real secrets, API keys, or credentials
- Use `.env.example` for documenting required environment variables
- Keep `.env` files in `.gitignore`
- Use placeholder values in `.env.example` that match local Docker services
