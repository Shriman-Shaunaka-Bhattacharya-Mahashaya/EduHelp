# Testing EduHelp

Use Node.js 22.14 or newer and install the lockfile with `npm ci`.

| Command | Checks |
| --- | --- |
| `npm run lint` | Next.js/React and TypeScript lint rules |
| `npm run typecheck` | Generated Next.js route types and strict TypeScript |
| `npm test` | Deterministic unit, component, model, and API handler tests |
| `npm run test:coverage` | Tests plus HTML and LCOV coverage in `coverage/` |
| `npm run build` | Production compilation, including TypeScript validation |
| `npm run test:e2e` | Production browser tests; run the build first |
| `npm run check` | Lint, types, coverage, and production build |

Before the first local browser run, run `npx playwright install` (local Linux machines may also need `--with-deps`). GitHub Actions uses the official Playwright container with browsers and system dependencies already installed. Playwright starts an isolated production server on port 3100 and supplies test-only environment values. It never connects browser flows to your production database: API requests in the authenticated UI tests are intercepted with deterministic fixtures. Run browser tests with a free port 3100. HTML reports are written to `playwright-report/`; screenshots and failure traces are in `test-results/`.

## What is covered

- Light, dark, and system preferences, invalid/blocked storage, cross-tab changes, persistence, and pre-hydration initialization.
- Authentication form labels, role-specific inputs, submission, network and credential errors, and registration confirmation.
- Registration API required fields, duplicate accounts, password hashing, role-specific writes, and database errors.
- Session and role guards across protected student, instructor, exams, messages, notifications, class, and profile API handlers.
- Exam start/resume, scheduled time boundaries, completed attempts, answer secrecy, submission validation, server-side scoring, and unanswered questions.
- Notification scoping, unread counts, pagination limits, and bulk read updates.
- Document text extraction, mocked OCR/Office parsing, temporary-file cleanup, chunk bounds, and invalid chunk parameters.
- Model requirements and defaults, and Google Meet URL validation and class audience restrictions.
- Chromium, Firefox, WebKit, and mobile Chromium flows; both themes; WCAG automated accessibility checks; keyboard navigation; reduced motion; responsive overflow; and student/instructor dashboard navigation.

## GitHub Actions

`.github/workflows/ci.yml` runs on every push and pull request, and supports manual dispatch. It uses read-only repository permissions and requires no production secrets. The two jobs run quality/unit checks and production browser tests. Both upload reports for 14 days, including on failures. No deployment, commit, or push step is included.

After pushing this configuration yourself, you can make the two job checks required in your GitHub branch protection/ruleset settings. A workflow alone reports failures; it does not prevent direct pushes.

The runner is pinned to Ubuntu 24.04. Browser tests run in `mcr.microsoft.com/playwright:v1.65.0-noble`, avoiding runtime `apt` downloads and Ubuntu mirror DNS failures during `playwright install --with-deps`. Keep this image version aligned with the resolved `@playwright/test` version in `package-lock.json` when upgrading Playwright. The workflow checks for all three browser executables before building, and each browser-job command has a timeout. If registry or npm connectivity fails, the job still requires a rerun after connectivity recovers; no tests are skipped to hide infrastructure failures.

The browser preflight and test steps set `HOME=/root` because the container runs as root. GitHub's default `/github/home` mount can be owned by another user, which prevents Firefox from starting. Preflight launches and closes Chromium, Firefox, and WebKit before the production build so browser startup failures stop the job immediately rather than repeating across tests and retries. Local home-directory settings are unchanged.

## Honest coverage boundaries

This suite is a regression foundation, not a claim of exhaustive testing. The initial local run has 189 unit/component/API tests and 64 browser scenarios. Instrumented line coverage across the configured application files is about 24.6%; browser coverage is not merged into that figure. Theme utilities and registration API coverage are enforced at 100%, with explicit thresholds for the theme provider. The coverage report includes untested application files so missing coverage remains visible. Browser fixtures validate the actual rendered frontend but do not exercise live MongoDB, Cloudinary, Groq, Atlas vector search, OCR binaries, or live Google Meet calls. Those integrations, full proctoring/offline recovery, destructive cleanup jobs, and load/security testing need dedicated isolated test environments and further scenarios. No real external-service credentials are used by these tests.

The repository already contained lint debt. `eslint-suppressions.json` records the existing violation counts by file and rule using ESLint bulk suppressions. CI rejects additional violations instead of disabling those rules. As existing files are cleaned up, run `npx eslint . --prune-suppressions` and review the reduced baseline. Do not regenerate the baseline to hide new violations. Existing warning-level rules remain visible. TypeScript errors are no longer skipped during builds.

The administrative embedding backfill route and cron endpoints require a separate authorization review before exposing them to untrusted callers; the general session-guard suite covers session-protected routes only.
