---
title: Deployment
description: Deployment strategy, platform choice, CI/CD workflow, and integration checks for Sports Live Tracker.
---

## 1. Deployment Overview

This document outlines the **deployment strategy** for the Sports Live Tracker project. It covers **deployment platform choice**, **integration reviews**, and **CI/CD pipeline** setup.

**Objectives:**
- Ensure the application is accessible to end users.
- Maintain stability and reliability in the live environment.
- Automate deployments and tests to prevent broken releases.
- Track versions and roll back if necessary.

---

## 2. Deployment Platform Choice

### Platform Selected: **Render**
- **Reasoning**:
  - Supports full-stack Node.js + React deployments.
  - Easy GitHub integration for automatic builds.
  - Free tier for testing and development.
  - Built-in environment variable management.
  - Provides logs for monitoring runtime errors.



> Screenshot placeholder: Deployment Platform Dashboard
> ![Deployment Platform Dashboard](/diagrams/deployment_dashboard.png)

---

## 3. Deployment Process

### 3.1 Branching & Versioning
- Feature and fix branches (`feature/*`, `fix/*`) are merged into `main`.
- Only `main` is deployed to the live environment.
- Semantic versioning tags (v1.0.0, v1.1.0) mark release points.

### 3.2 CI/CD Pipeline
- Trigger: Push or merge into `main` branch.
- **Steps:**
  1. Pull latest code from `main`.
  2. Install dependencies (`npm install`).
  3. Run tests (`npm test`).
  4. Build frontend (`npm run build`).
  5. Deploy to Render environment.
 
  
> Screenshot placeholder: CI/CD Workflow
> ![CI/CD Workflow](/diagrams/dCICD.png)

### 3.3 Post-Deployment Checks
- Verify live application matches sprint deliverables.
- Check API endpoints using Postman or automated scripts.
- Confirm database connectivity and authentication.
- Monitor logs for runtime errors.

> Screenshot placeholder: Deployment Logs
> ![Deployment Logs](/diagrams/dCICD.png)

---

## 4. Integration Review

- Backend and frontend were tested in staging environment before production deployment.
- User authentication flows verified after deployment.
- Database CRUD operations confirmed via live environment.

> Screenshot placeholder: Staging / Integration Testing
> ![Integration Test](/diagrams/dCICD.png)

---

## 5. Rollback & Recovery

- Each deployment is linked to a Git tag, allowing rollback if critical bugs appear.
- Manual rollback steps:
  1. Checkout previous stable commit: `git checkout v1.0.0`
  2. Deploy to Render
  3. Verify functionality

> Screenshot placeholder: Version Tags / Rollback
> ![Git Version Tags](/diagrams/dCICD.png)

---

## 6. References & Resources

- Render Docs: [https://render.com/docs](https://render.com/docs)  
- GitHub Actions: [https://docs.github.com/en/actions](https://docs.github.com/en/actions)  
- CI/CD Best Practices: [https://www.atlassian.com/continuous-delivery](https://www.atlassian.com/continuous-delivery)  
- Deployment Strategies: [https://martinfowler.com/bliki/DeploymentPipeline.html](https://martinfowler.com/bliki/DeploymentPipeline.html)  
