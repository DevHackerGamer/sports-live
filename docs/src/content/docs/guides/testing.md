---
title: Testing Documentation
description: This document provides a detailed overview of the testing strategy, tools, workflows, and user feedback process for the Sport Live Feeds project.  
---

This document provides a detailed overview of the testing strategy, tools, workflows, and user feedback process for the **Sport Live Feeds** project.  
It ensures that our system is robust, reliable, and aligned with both stakeholder and user expectations.

## Testing Framework

We are using:

- **Jest** → for unit testing JavaScript functions and API logic. 
- **React Testing Library** → for UI testing of React components.  
- **Supertest** → for testing backend API endpoints. 

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
- **UI Testing** → [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) 
- **API Testing** → [Supertest](https://github.com/ladjs/supertest)  

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
## How to Run Automated Tests:
A small test by test description on how to run the automated tests for both frontend components and backend APIs. 
### 1. Install Dependencies
Make sure you have installed all project dependencies:
```bash
npm install
```
### 2. Run All Tests

To run every test (React + API):
```bash
npm test
```
This will:

- Discover all files ending with .test.js inside both src/ and api/.

- Run them in parallel.

- Display results in the terminal.

### 3. Run Coverage Report

To generate a code coverage report:
```bash
npm run test:coverage
```
The summary appears in the terminal.

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


# UI Testing

We use **React Testing Library**to simulate user interactions:

Rendering components correctly

Testing form submissions (e.g., adding a live event)

Checking that the UI updates when events are added/removed
Example Test:
![teste1](/diagrams/teste1.png)

# API Testing

We use **Supertest** to simulate API endpoints:


Example Test:
![teste1](/diagrams/teste1.png)






