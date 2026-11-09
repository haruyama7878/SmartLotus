# Contributing

## Git Flow

The repository uses five Git Flow branch types:

| Branch                    | Purpose                                       |
| ------------------------- | --------------------------------------------- |
| `main`                    | Production-ready code                         |
| `develop`                 | Shared integration branch                     |
| `feature/<ticket>-<slug>` | New functionality, branched from `develop`    |
| `release/<version>`       | Release hardening, branched from `develop`    |
| `hotfix/<ticket>-<slug>`  | Urgent production fixes, branched from `main` |

`qa` and `staging` exist as optional environment-promotion branches. They are not substitutes for
the five Git Flow branch types above.

Never develop directly on `main` or `develop`. Feature branches merge into `develop` through pull
requests. Release branches merge into both `main` and `develop`, then receive a SemVer tag such as
`v1.0.0`. Hotfix branches merge into both `main` and `develop`. Never force-push protected branches.

## Daily Workflow

```bash
git fetch --all --prune
git switch develop
git pull --ff-only origin develop
git switch -c feature/SL-123-adaptive-quiz

# work, test, then commit
git add <files>
git commit -m "feat(learning): validate adaptive quiz output"
git push -u origin feature/SL-123-adaptive-quiz
```

## Conventional Commits

Use `<type>(<scope>): <description>` with one of:

`feat`, `fix`, `docs`, `style`, `refactor`, `test`, `perf`, `build`, `ci`, `chore`.

Examples: `feat(auth): implement JWT authentication`, `fix(user): resolve null pointer exception`.

## Pull Requests

- PR titles must use Conventional Commits.
- Describe purpose, main changes, testing evidence, and related issue.
- Require review before merge.
- Do not merge conflicts or failing CI.
- Require extra review for security, schema, scoring, personalization, and authorization changes.

## Backend Checks

From `backend/`:

```bash
./mvnw clean test
./mvnw package -DskipTests
./mvnw -Pintegration -Dapi.version=1.40 test
```

The integration suite requires Docker. Do not commit credentials, local `.env` files, build output,
or generated IDE metadata.

See [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md) for the complete flow and GitHub administration
checklist.
