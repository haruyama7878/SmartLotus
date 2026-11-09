# Git Flow

## Branches

| Branch                    | Source          | Purpose                | Merge target         |
| ------------------------- | --------------- | ---------------------- | -------------------- |
| `main`                    | release/hotfix  | Production-ready code  | production           |
| `develop`                 | `main` baseline | Shared integration     | `qa` or release      |
| `feature/<ticket>-<slug>` | `develop`       | New functionality      | `develop` via PR     |
| `release/<version>`       | `develop`       | Release hardening only | `main` and `develop` |
| `hotfix/<ticket>-<slug>`  | `main`          | Urgent production fix  | `main` and `develop` |

The repository also has optional `qa` and `staging` promotion branches. They are environment
branches, not additional Git Flow branch types.

## Standard Flows

### Feature

```bash
git fetch --all --prune
git switch develop
git pull --ff-only origin develop
git switch -c feature/SL-123-user-authentication

# implement and validate
git add <files>
git commit -m "feat(auth): implement JWT authentication"
git push -u origin feature/SL-123-user-authentication
```

Open a PR into `develop`. Do not merge locally or push directly to protected branches.

### Release

```bash
git switch develop
git pull --ff-only origin develop
git switch -c release/1.0.0
git push -u origin release/1.0.0
```

Only release notes, versioning, migration checks, and bug fixes belong on a release branch. After
approval, merge the release PR into both `main` and `develop`, then create and push the tag:

```bash
git switch main
git pull --ff-only origin main
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

### Hotfix

```bash
git switch main
git pull --ff-only origin main
git switch -c hotfix/SL-456-payment-crash
git push -u origin hotfix/SL-456-payment-crash
```

Merge the hotfix into both `main` and `develop`. Never force-push either protected branch.

## Naming

- `feature/user-authentication`
- `fix/login-validation`
- `release/1.0.0`
- `hotfix/payment-crash`

Use lowercase kebab-case and include the issue key when one exists.

## Commits

Use `<type>(<scope>): <description>` with one of:

`feat`, `fix`, `docs`, `style`, `refactor`, `test`, `perf`, `build`, `ci`, `chore`.

Examples:

- `feat(auth): implement JWT authentication`
- `fix(user): resolve null pointer exception`
- `test(learning): cover personalization boundaries`

## GitHub Administration

Repository administrators should configure branch protection for `main` and `develop`:

- Require pull requests and at least one approval.
- Require the `Backend CI / unit` and `Backend CI / integration` checks.
- Require branches to be up to date before merging.
- Block force pushes and branch deletion.
- Dismiss stale approvals when new commits are pushed.
- Restrict who can push directly to protected branches.

These settings require GitHub repository administration access and cannot be guaranteed by local
files.
