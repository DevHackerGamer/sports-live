---
title: Testing 
description: Life
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

Additional linting configurations and scripts for the backend may be included in later sprints or located in their respective folders.

---

## Testing

Automated testing is planned for future development stages. The following tools are being considered:

| Tool                  | Purpose                                                             |
| --------------------- | ------------------------------------------------------------------- |
| **Jest**              | Unit testing for React components and frontend logic.               |
| **Firebase Test SDK** | Testing Firebase Cloud Functions and backend behavior in isolation. |

Currently, testing is performed manually for each feature during development and before merging pull requests.

---

## CI and Future Integration

In upcoming sprints, we plan to integrate continuous integration workflows that will:

- Automatically run linting and tests on pull requests
- Reject code that fails formatting or test cases
- Improve reliability and maintainability of the codebase

CI tooling under consideration includes GitHub Actions or Firebase Hosting pre-deploy hooks.

---

## Developer Guidelines

- All new features must be manually tested before merge.
- Linting errors must be resolved before committing.
- Contributors are encouraged to write unit tests once testing infrastructure is in place.

This ensures a stable, maintainable codebase as the application grows.
