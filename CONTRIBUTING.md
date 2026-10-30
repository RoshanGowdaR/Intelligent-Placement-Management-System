# 🤝 Contributing to Intelligent Placement Management System (IPMS Elite)

Thank you for your interest in contributing to **IPMS Elite**! We are committed to building an open, secure, and world-class AI placement and recruitment ecosystem for universities and enterprises.

Please read through these guidelines to ensure a smooth, standardized, and high-quality contribution process.

---

## 📜 Table of Contents
1. [Code of Conduct](#code-of-conduct)
2. [Git Branching Strategy](#git-branching-strategy)
3. [Commit Message Standards](#commit-message-standards)
4. [Local Development Setup](#local-development-setup)
5. [Quality Assurance & Pre-Flight Checks](#quality-assurance--pre-flight-checks)
6. [Submitting Pull Requests](#submitting-pull-requests)
7. [Reporting Bugs & Requesting Features](#reporting-bugs--requesting-features)

---

## 1. Code of Conduct

All contributors and maintainers are expected to maintain a professional, respectful, and collaborative environment. Treat everyone with respect regardless of experience, background, or identity.

---

## 2. Git Branching Strategy

We follow a structured Git branching model to maintain production stability:

- **`main`**: Production branch. Strictly protected; only updated via tested PRs from `developer`.
- **`developer`**: Active integration branch. All features, bug fixes, and documentation merge here first.
- **`feature/<feature-name>`**: Dedicated branches for new functional capabilities.
- **`fix/<issue-name>`**: Dedicated branches for bug fixes and patches.
- **`docs/<topic>`**: Documentation updates.

### Workflow Example:
```bash
# 1. Switch to the developer branch and pull the latest changes
git checkout developer
git pull origin developer

# 2. Create a new topic branch
git checkout -b feature/proctor-gaze-tracking

# 3. Work on changes, commit, and push
git push origin feature/proctor-gaze-tracking
```

---

## 3. Commit Message Standards

We enforce **Conventional Commits** (`v1.0.0`) to ensure readable and automated release histories:

```
<type>(<scope>): <short description>

[optional body]
[optional footer(s)]
```

### Supported Types:
- **`feat`**: A new feature for the user (e.g. `feat(ai): add interactive Recharts bar gauge to placement chat`)
- **`fix`**: A bug fix (e.g. `fix(proctor): prevent duplicate tab-switch increments on window blur`)
- **`docs`**: Documentation only changes (e.g. `docs(prd): add multi-round drive engine specification`)
- **`test`**: Adding missing tests or correcting existing tests (e.g. `test(scoring): add points weighting tests`)
- **`refactor`**: Code change that neither fixes a bug nor adds a feature
- **`ci`**: Changes to CI/CD workflows and configuration scripts (e.g. `ci(github): add backend test workflow`)
- **`perf`**: A code change that improves performance

---

## 4. Local Development Setup

### Prerequisites
- **Node.js**: `v20.x` or higher (Active LTS)
- **npm**: `v10.x` or higher
- **Git**: Installed and configured

### Quickstart Steps
```bash
# 1. Clone repository
git clone https://github.com/RoshanGowdaR/Intelligent-Placement-Management-System.git
cd Intelligent-Placement-Management-System

# 2. Install dependencies with exact lockfile resolution
npm ci

# 3. Setup environment variables
cp .env.example .env
# Edit .env with your Supabase URL, Anon Key, and Gemini/Groq API keys

# 4. Start local development server
npm run dev
# The application will launch at http://localhost:5173
```

---

## 5. Quality Assurance & Pre-Flight Checks

Before opening a pull request, you **must** run and pass the following quality gates locally:

```bash
# 1. Static Typecheck (Must pass with 0 errors)
npm run typecheck

# 2. Run ESLint
npm run lint

# 3. Run full automated test suite (All 67 tests must pass)
npm test -- --run

# 4. Run backend recruitment & proctor engine tests
npm run test:backend

# 5. Production build verification (Must produce valid dist bundle)
npm run build
```

Any PR that fails TypeScript compilation, Vitest tests, or Vite bundling will be blocked by GitHub Actions CI.

---

## 6. Submitting Pull Requests

1. **Keep PRs Focused**: Address a single issue or feature per PR.
2. **Include Tests**: If you add new business logic (e.g., scoring rules, eligibility calculations, proctor handlers), write corresponding Vitest unit tests in `src/test/`.
3. **Update Documentation**: Update [`README.md`](README.md), [`TEST_PLAN.md`](TEST_PLAN.md), or [`docs/`](docs/) if your changes alter interfaces, schemas, or behaviors.
4. **Draft PR**: Open PR with base branch `developer`. Fill out the PR template detailing:
   - Summary of changes
   - Motivation and context
   - Test execution results
   - Screenshots / screencasts for UI updates

---

## 7. Reporting Bugs & Requesting Features

- **Bug Reports**: Open an issue using the Bug Report template. Include steps to reproduce, expected behavior, actual behavior, browser version, and console logs.
- **Security Vulnerabilities**: Do **not** post security bugs publicly. Reach out directly to the core maintainers.
