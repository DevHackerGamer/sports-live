---
title: General Discussion
description: Comprehensive discussion on the Sports Live Tracker project, design decisions, and outcomes.
---

# General Discussion

The **Sports Live Tracker** project was designed to deliver a **real-time sports broadcasting and viewer experience tool**. This discussion reflects on the project’s purpose, design decisions, technical choices, and overall outcomes.

---

## 1. Project Purpose and Objectives

The main objective of Sports Live Tracker was to provide users with **instant access to live sports updates**, including scores, player statistics, and event timelines. Key goals included:

- Building a **scalable, real-time backend** capable of handling multiple simultaneous matches.
- Developing a **responsive frontend** that displays live data dynamically.
- Providing **user authentication and role-based access** to protect sensitive operations.
- Enabling administrators to **input match events manually** when automatic feeds are unavailable.
- Integrating APIs and third-party services to supplement live sports data.

These objectives guided both the **technical architecture** and the **development methodology**.

---

## 2. Design and Implementation Choices

### 2.1 Frontend

- Built using **React** for a responsive and interactive user interface.
- Styling was managed with **TailwindCSS**, supplemented by **shadcn/ui components** and custom CSS modules.
- Protected routes and session management were implemented using **Clerk**, ensuring secure user authentication.
- Core components include:
  - `Dashboard.js` – main hub for viewing live scores.
  - `PlayersPage.js` – player statistics and details.
  - `ReportsPage.js` – match reporting and event logs.
  - `EventFeed.js` – real-time event timeline.

### 2.2 Backend

- Built using **Node.js and Express**, deployed on **Render**.
- Supported **RESTful APIs**, real-time updates via **polling and webhooks**, and **MongoDB** for persistent storage.
- Key endpoints included:
  - `api/matches.js`, `api/players.js`, `api/teams.js`, `api/reports.js`, etc.
- Secure endpoints integrated with Clerk session validation to prevent unauthorized access.

### 2.3 Development Methodology

- Followed **Agile Scrum framework**, with **two-week sprints**, daily standups, sprint reviews, and retrospectives.
- Tools such as **Notion**, **Discord**, and **GitHub** facilitated planning, task tracking, and code collaboration.
- CI/CD pipelines ensured that all code met **linting, formatting, and testing standards** before merging into the main branch.

---

## 3. Achievements and Outcomes

- Delivered a **fully functional MVP** demonstrating live match updates, dashboards, and reporting functionality.
- Created a **secure authentication system** for both admin and regular users.
- Implemented **real-time data handling** through API endpoints and frontend subscriptions.
- Designed a **user-friendly interface** with responsive layouts, interactive event feeds, and visualizations.
- Maintained high **code quality**, using ESLint, Prettier, and peer-reviewed pull requests.

---

## 4. Lessons Learned

- Agile methodology **enabled iterative improvement**, allowing us to incorporate feedback from sprint reviews and refine features.
- Real-time data handling introduced challenges with **race conditions and caching**, highlighting the importance of planning and testing.
- Effective **communication and Git workflows** were critical for synchronizing tasks among multiple developers.

---

## 5. Reflection on Stakeholder Interaction

- Regular sprint reviews allowed the **stakeholder (tutor) to monitor progress**, provide feedback, and influence feature prioritization.
- This engagement ensured that the project aligned with both **academic requirements** and **user needs**.
- The use of Notion and GitHub provided **traceability**, showing clear ownership of tasks and features.

---

## 6. Overall Evaluation

The project successfully demonstrated the integration of **frontend, backend, and authentication systems**, delivering a **cohesive real-time sports tracking tool**. While certain features (like automated API integration for all leagues) remain future enhancements, the core objectives were fully achieved.

> In conclusion, Sports Live Tracker represents a robust, extensible, and user-focused system, built using **modern web development practices, Agile methodology, and secure authentication mechanisms**.

---

## References

- React Documentation: [https://react.dev/docs](https://react.dev/docs)  
- Node.js Documentation: [https://nodejs.org/docs](https://nodejs.org/docs)  
- Express Documentation: [https://expressjs.com](https://expressjs.com)  
- Clerk Documentation: [https://clerk.dev/docs](https://clerk.dev/docs)  
- MongoDB Docs: [https://www.mongodb.com/docs](https://www.mongodb.com/docs)  
- TailwindCSS Docs: [https://tailwindcss.com/docs](https://tailwindcss.com/docs)  
- Agile & Scrum: [https://www.scrumguides.org/](https://www.scrumguides.org/)

