---
title: Testing Documentation
description: Life
---

This document provides a detailed overview of the testing strategy, tools, workflows, and user feedback process for the **Sport Live Feeds** project.  
It ensures that our system is robust, reliable, and aligned with both stakeholder and user expectations.

## Testing Framework

We are using:

- **Jest** → for unit testing JavaScript functions and API logic. 

### Why we Chose Jest:

We selected **Jest** as our testing framework because:  

- It's  **Easy to Setup** → With no complex configuration.  
-  **Fast & Reliable** → We can run the testing in Parallel, which is faster.
-  **Readable Syntax** → Simple test functions (`test`, `expect`) make it easy for all team members to contribute.  
-  **Coverage Reporting** → Built-in support for code coverage to track test completeness.  
- **It's a largely used Testing Framework** → Widely used in React and Node.js projects.

Given our project’s **React frontend** and **Node.js API layer**, Jest was the **natural fit** for unit testing.  

### Setup
- **Framework** → [Jest](https://jestjs.io/)  

#### Installiation:
**Install Jest:**
```bash
npm install --save-dev jest
```
**Install React Testing Library:**
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom

```
**Configure package.json**
```bash
"scripts": {
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage"
}

```
**Setup File(setupTests.js)**
In the root of your project create:
// setupTests.js:
```bash
import '@testing-library/jest-dom'; 
```
## Testing Organization:
We follow **consistent naming:**
- All tests files end with .test.js
- Tests are stored alongside components in each components folder

Our Folder Structure:
 ![testf](/diagrams/testf.png)
---
### Unit Testing Strategy
**Functions** → Test input/output correctness.

**Modules** → Test business logic in isolation.

**Error Handling**→ Test invalid or missing input cases.

We aim for 80%+ coverage, with priority on:

- Match creation

- Event logging

- Score Display & Dashboard

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
