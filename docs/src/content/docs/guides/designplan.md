---
title: Inital Design & Development Plan
description: Development workflow and best practices for Sports Live.
---

### Project Goal

To provide a **clear roadmap and development plan** for the Sports Live Tracker project, including timelines, responsibilities, design artifacts, and stakeholder interaction.

---

##  Roadmap with Milestones (4 Weeks)

| Week | Focus Area      | Tasks / Deliverables                                                                 |
|------|-----------------|--------------------------------------------------------------------------------------|
| 1    | Setup & Design  | - Set up GitHub repo & CI/CD <br> - Project scaffolding (React + Node + DB) <br> - UI wireframes (Figma) <br> - Architecture diagram |
| 2    | Authentication  | - Implement sign-up/login/logout <br> - Role-based access (admin, user) <br> - Connect to DB for user storage |
| 3    | Core Features   | - Live score input (admin) <br> - Real-time updates (WebSocket) <br> - Dashboard for viewers |
| 4    | Testing & Feedback | - Unit & integration tests <br> - Usability testing session <br> - Sprint Review demo <br> - Collect & apply feedback |

**Tools**: GitHub, Notion, Figma, Draw.io, Clerk/Auth0, Firebase, Express.js, React, Jest  


## System Design

### 1. System Architexture
- **Frontend (React)** – UI for viewers and admins.

- **Backend (Node.js + Express)** – APIs + Functions

- **Database (MongoDB)** – persistent storage.

- **Third-party API** – Football-Data.org (live stats).

- **Deployment** – Render (frontend + backend).

📌 Diagram → System architecture showing data flow (React ↔ Express ↔ MongoDB + external API)
---

### 2.Design Artifacts (UI/UX Planning) 
**Wireframes** for:

- Login Page – simple Clerk auth.

- Dashboard – shows live matches + navigation.

- Match Details – scoreboard, timeline, events.

- Admin Match Input – add/edit match + events.

 ![Wireframes](/diagrams/wiref.png)
---
## 3. UML Diagrams

### Use Case Diagram
> Shows how admins, viewers, and guests interact with the system.
![Use Case Diagram](/diagrams/use.png)

Main Use Cases:

Admin → Add/Edit/Remove Matches, Manage Users, Push Updates

Viewer → View Live Scores, Follow Teams, Receive Notifications

---
### Component Diagram

> High-level breakdown of frontend, backend, and Firebase integration.

![Component Diagram](/diagrams/component.png)

Components:

 **Frontend (React)**
- Pages (Login, Dashboard, Viewer)
- Reusable Components (MatchCard, ScoreBoard) 
- Talks to backend via REST APIs and WebSockets  

**Backend (Node.js + Express)**
- Auth Service
- Match Service 
- Database (Firebase)
- MongoDB: Matches, Users, Events


---
### Sequence Diagram

> Example: Admin adds a goal → Viewers see it live.

![Sequence Diagram](/diagrams/sequence.png)

---
##  Data Model (ER Diagram)

> Entities: User, Team, Match, Event, Player.


![ER Model](/diagrams/class.png)

---

###  Deployment Diagram

> Local dev, Azure hosting,MongoDB integration.


![Deployment Diagram](/diagrams/deployment.png)

---

# Continous Improvement

- Planning documents revised after every sprint.
- Wireframes updated based on tutor feedback.
- Database schema evolved as features expanded.

---



---

---


#