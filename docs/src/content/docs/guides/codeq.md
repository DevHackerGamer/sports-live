---
title:  Code Quality Tools
description: Tools and guidelines for maintaining code quality in the project.
---


This page documents the tools and practices used to maintain a consistent and high-quality codebase for the project. It covers the package manager, bundler, linting, code formatting, and developer best practices.

---

## Linting

Linting is enforced across both the frontend and backend to maintain code consistency and catch common issues early.

- **Tool Used**: [ESLint](https://eslint.org/)
- **Configuration**: Separate ESLint config files are used for the frontend and backend to accommodate context-specific rules and frameworks.

### Running the Linter

To run the linter on the frontend, use:

```bash
npm run lint
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
## Code Formatting
Prettier is used to maintain consistent code style across the project.

- **Tool**: [Prettier](https://prettier.io/)  
- **Purpose**: Automatically format code according to style rules.
- **Common Usage**: involves checking formatting and applying formatting to your codebase.
```bash
# Check formatting
npx prettier --check .
# Automatically format all files

npx prettier --write .
```
---
## Bundler
A bundler compiles, optimizes, and packages frontend code (JavaScript, CSS, assets) for the browser.

- **Tool**: [Vite](https://vitejs.dev/)
- **Purpose**:  Fast, modern frontend bundler for React and other frameworks.

- **Tool**: [Webpack](https://webpack.js.org/)
- **Purpose**:Traditional bundler used by create-react-app.
### Vite
```bash
npm run dev      # Start development server
npm run build    # Build production files
npm run preview  # Preview production build
```
### Webpack (via react-scripts)
```bash
npm start       # Start development server
npm run build   # Build production files
```

Tip: Always build your project before deploying to ensure all assets are bundled and optimized.

---
## Developer Guidelines
- Run linting (npm run lint) and formatting (npx prettier --write .) before committing code
-Resolve all linting errors before merging to main branches.
-Follow ESLint and Prettier rules to ensure consistent and readable code.
-Use npm scripts and bundler commands for development and production builds.