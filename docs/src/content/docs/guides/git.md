---
title: Git Methodology
description: How we use Git for version control, collaboration, and code deployment
---

## Overview

Our Git workflow is designed to support **asynchronous development** by allowing each team member to work independently on their own branch and merge once their work is complete. This approach supports flexibility while keeping the `main` branch stable for deployment.

## Branching Strategy

We follow a **"one developer, one branch"** model:

- Each developer creates a personal branch from `main`
- Branches are named clearly based on the feature or the developer, e.g.:
  mohau-auth-setup
  josh-profile-page

- Once work is complete and tested, the developer **merges their branch into `main`**

There is currently **no pull request (PR) review process** in place — developers merge directly when their work is finished.

## Merging to Main

Before merging into `main`, developers should:

- Ensure that their code runs correctly
- Avoid breaking any existing features
- Pull the latest changes from `main` and resolve any conflicts

> Tip: To prevent overwriting someone else’s work, always `git pull origin main` before merging.

## Versioning and GitHub Releases (Planned)

The team has been advised to start using **GitHub Releases** to manage production-ready versions of the app.

> A **GitHub Release** is a way to mark a specific commit in your history as a "release" (like `v1.0.0`) and attach notes or changelogs to it. This helps with:
>
> - Tracking what features were added in each version
> - Rolling back if something breaks
> - Clear handover when deploying

We plan to use **Semantic Versioning** in the future:

v1.0.0 → Initial complete release
v1.1.0 → Adds new features
v1.1.1 → Fixes bugs

rust
Copy
Edit

More details will be added here once GitHub Releases are introduced into the team's workflow.
