---
title:  Code Quality Tools
description: Tools and guidelines for maintaining code quality in the project.
---

This page documents the tools and practices used to maintain a consistent and high-quality codebase for the project. It covers the package manager, bundler, linting, code formatting, and developer best practices.
<!-- This is a comment -->
---
## Linting

Linting is enforced across both the frontend and backend to maintain code consistency and catch common issues early.

- **Tool Used**: [ESLint](https://eslint.org/)
- **Configuration**: Separate ESLint config files are used for the frontend and backend to accommodate context-specific rules and frameworks.
- **Enforcement**:  
  - Runs locally with `npm run lint`  
  - Auto-fix with `npm run lint:fix`  


### Running the Linter

To run the linter on the frontend, use:

```bash
npm run lint
```
---
## Code Formatting
Prettier is used to maintain consistent code style across the project.

- **Tool**: [Prettier](https://prettier.io/)  
- **Purpose**: Automatically format code according to style rules.
- **Common Usage**: involves checking formatting and applying formatting to your codebase.
- **Enforcement**:  
  - `npm run format` formats all the files 
  - `npm run check-format` ensure formatting compliance
```bash
# Check formatting
npx prettier --check .
# Automatically format all files

npx prettier --write .
```

---
## Package Manager

- **Tool**: [npm](https://www.npmjs.com/)  
- **Purpose**: Manage dependencies, scripts, and project packages.  
- **Common Usage**: installing dependencies, running scripts, adding/removing packages, and managing versions
```bash
# Install project dependencies
npm install
# Run defined scripts (e.g., lint, test, start)
npm run <script>
```

---
## Bundler
A bundler compiles, optimizes, and packages frontend code (JavaScript, CSS, assets) for the browser.

- **Tool**: [Vite](https://vitejs.dev/)
- **Purpose**:  Fast, modern frontend bundler for React and other frameworks.


```bash
npm run dev      # Start development server
npm run build    # Build production files
npm run preview  # Preview production build
```


Tip: Always build your project before deploying to ensure all assets are bundled and optimized.

---
## Developer Guidelines
- Run linting (npm run lint) and formatting (npx prettier --write .) before committing code
-Resolve all linting errors before merging to main branches.
-Follow ESLint and Prettier rules to ensure consistent and readable code.
-Use npm scripts and bundler commands for development and production builds.

<!-- Usage in the Project

During Development:
Developers run npm run dev (backend + frontend). Husky ensures code is linted and formatted before every commit.

Before Deployment:
Code is tested (npm test), linted (npm run lint), and formatted (npm run format).

In Production:
The app is built with Webpack (npm run build), ensuring optimized assets.

On GitHub CI:
Every pull request triggers automated linting, formatting, and tests, guaranteeing code quality at team level.

Why This Matters

By combining ESLint, Prettier, Husky, lint-staged, and CI pipelines, the Sports Live project ensures:

No inconsistent code style

No untested features are merged

No bad commits enter the repo

Automated enforcement keeps developer productivity high

This creates a professional-grade development environment with maximum reliability and maintainability -->