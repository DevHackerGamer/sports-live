---
title: Git Methodology
description: How we use Git for version control, collaboration, and code deployment
---

## Overview

Our Git workflow is designed to support **asynchronous development** by allowing each team member to work independently on their own branch and merge once their work is complete. This approach supports flexibility while keeping the `main` branch stable for deployment.

**Benefits of using Git:**

- Tracks all changes to the codebase  
- Enables collaboration across multiple developers  
- Provides the ability to revert or rollback changes  
- Supports integration with deployment tools and CI/CD pipelines  

> Git ensures transparency, accountability, and quality control in team development.

---

## Branching Strategy

We follow a **"one developer, one branch"** model:

- Each developer creates a personal branch from `main`
- Branches are named clearly based on the feature or the developer, e.g.:
  lebo-profile-page

- Once work is complete and tested, the developer **submits a PR to merge their branch into `main`**

### Branch Naming Conventions

Examples:

- `feature/authentication-flow`  
- `fix/player-stats-bug`  
- `docs/git-methodology`  

## Pull Request (PR) Review Process

To improve code quality and team collaboration, we  implemented a **Pull Request (PR) review process**. This process ensures that every change merged into `main` is reviewed and approved by at least one other developer.

### Workflow:

1. **Feature Development**
   - Each developer works on their own feature branch (e.g., `feature/live-search`).
   - Commits follow the semantic commit conventions: `feat:`, `fix:`, `docs:`, etc.

2. **Create Pull Request**
   - Once the feature is complete and tested locally, the developer creates a **pull request** targeting `main` (or `develop`, if used).
   - The PR includes:
     - A clear title describing the feature or fix
     - A description of what was done
     - References to related issues (if any)

3. **Code Review**
   - Another team member reviews the PR, checking:
     - Correct functionality
     - Code readability and consistency
     - Documentation and comments
     - Compliance with project standards
   - Reviewers can request changes or approve the PR

4. **Merge PR**
   - Once approved, the PR is merged into `main`.
   - Conflicts are resolved before merging.
   - Optionally, the branch is deleted after merging to keep the repository clean.

**Benefits of PR Review Process:**

- Ensures **code quality and consistency** across the project  
- Provides **peer feedback** and knowledge sharing  
- Reduces the risk of **breaking features in `main`**  
- Creates a clear history of **who approved what**  

## Merging to Main

Before merging into `main`, developers should:

- Ensure that their code runs correctly
- Avoid breaking any existing features
- Pull the latest changes from `main` and resolve any conflicts

> ⚠️ Tip: To prevent overwriting someone else’s work, always `git pull origin main` before merging.
```bash
  git pull origin main
  ```


## Commit Strategy

We follow **semantic and descriptive commit messages** to make the project history clear and trackable:

| Prefix     | Meaning                                   |
|-----------|------------------------------------------|
| feat:     | New feature added                         |
| fix:      | Bug fix                                   |
| docs:     | Documentation updates                     |
| style:    | Formatting or styling changes             |
| test: | adding or updating tests|

## Versioning and GitHub Releases (Planned)

The team has been advised to start using **GitHub Releases** to manage production-ready versions of the app.

> A **GitHub Release** is a way to mark a specific commit in your history as a "release" (like `v1.0.0`) and attach notes or changelogs to it. This helps with:
> - Tracking what features were added in each version
> - Rolling back if something breaks
> - Clear handover when deploying

We plan to use **Semantic Versioning** in the future:

- v1.0.1 → Initial complete release
- v2.0.0 Adds new features
- v3.0.1 → Fixes bugs
---

## Evidence of Git Methodology in Action

### 1. Branching
![GitHub Branches](/diagrams/branches.png)  
*Screenshot showing multiple branches (`main`, `feature/*`, developer branches). This demonstrates how work is isolated per feature to avoid breaking the `main` branch.*

---

### 2. Commit Strategy
![Commit History](/diagrams/commits.png)  
*Screenshot of the commit history on GitHub. Semantic commits such as `feat: add login functionality` and `fix: correct player stats bug` prove that the team followed a structured commit strategy for traceability.*

---

### 3. Pull Request Workflow
![Pull Request Example](/diagrams/pullrequest.png)  
*Screenshot of an open pull request. The PR includes a title, description, linked issue, and reviewer comments. This shows how peer review was done before merging changes into `main`.*

---


<!--### 4. CI/CD Integration
 ![GitHub Actions Checks](./screenshots/actions.png)  
*Screenshot of GitHub Actions checks running. This proves that each PR was automatically tested and linted before merging, enforcing quality standards and preventing broken code from entering `main`.* -->

---

### 4. Release Management
![GitHub Release](/diagrams/releases.png)  
*Screenshot of a GitHub Releases . This shows how the team marked stable versions, attached changelogs, and followed semantic versioning to prepare for deployment.*



## References & Resources

- Git Documentation: [https://git-scm.com/doc](https://git-scm.com/doc)  
- GitHub Guides: [https://guides.github.com/](https://guides.github.com/)  
- Atlassian Git Workflow Tutorial: [https://www.atlassian.com/git/tutorials/comparing-workflows](https://www.atlassian.com/git/tutorials/comparing-workflows)  

---
