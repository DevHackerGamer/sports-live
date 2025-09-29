---
title: Inital Design & Development Plan
description: Development workflow and best practices for Sports Live.
---


## 1. Introduction
The planning stage ensures the **Sports Live Tracker** project has a clear direction, defined deliverables, and agreed workflows.  
It lays out **timelines, responsibilities, risks, and feedback loops** with stakeholders.

---

## 2. Project Goals
- Build a **real-time sports live score application**.  
- Provide a **seamless UI** for users to track matches and league standings.  
- Allow **admins** to create and update matches live.  
- Deploy on a **scalable cloud environment** (Render + MongoDB Atlas).  
- Incorporate **user and stakeholder feedback** after each sprint.

---
## 3. Methodology

We followed an **Agile Scrum approach** with **weekly sprints**.  

### Key Practices
- **Backlog Management** → All features captured as user stories in Notion.  
- **Sprint Planning** → Weekly sprint planning with scope definition.  
- **Daily Standups** → Short syncs to track progress and blockers.  
- **Sprint Reviews** → End-of-sprint demos to stakeholders.  
- **Retrospectives** → Continuous improvement after each sprint.  

---
---

## 4  Roadmap with Milestones (4 Weeks)

| Week | Focus Area      | Tasks / Deliverables                                                                 |
|------|-----------------|--------------------------------------------------------------------------------------|
| 1    | Setup & Design  | - Set up GitHub repo & CI/CD <br> - Project scaffolding (React + Node + DB) <br> - UI wireframes (Figma) <br> - Architecture diagram |
| 2    | Authentication  | - Implement sign-up/login/logout <br> - Role-based access (admin, user) <br> - Connect to DB for user storage |
| 3    | Core Features   | - Live score input (admin) <br> - Real-time updates (WebSocket) <br> - Dashboard for viewers |
| 4    | Testing & Feedback | - Unit & integration tests <br> - Usability testing session <br> - Sprint Review demo <br> - Collect & apply feedback |

---

# 5. Stakeholder Interaction
- **Stakeholders:** Tutors, test users, classmates.  
- **Engagement:**  
  - Collected structured **feedback forms** (Google Forms).  
  - Held **live demo sessions** at the end of each sprint.  
  - Integrated suggestions (e.g., adding **league tables** in Sprint 3).  

# 6. Risk Analysis

| Risk | Impact | Mitigation |
|------|--------|------------|
| API downtime | Live scores unavailable | Use mock data fallback |
| Poor UX adoption | Users stop testing | Collect feedback early, improve UI each sprint |
| Real-time issues | Lag or missed updates | Combine WebSockets + polling fallback |
| Missed deadlines | Features incomplete | Scope control + prioritize core features |

---
# 7. Responsibility Assignment

Each team member had **clear ownership**:  

- **Frontend (React UI)** → Wireframes, dashboard, match viewer.  
- **Backend (Node)** → API endpoints
- **Database (MongoDB)** → Schema design, ERD.  
- **Authentication (Clerk)** → Secure login + role-based access.  
- **Testing (Jest)** → Automated unit + integration tests.  
- **Deployment (Render)** → Cloud hosting + CI/CD pipeline.  

---

# 8. Continuous Improvement
- Planning documents revised after each sprint.  
- Added **league standings feature** after Sprint 3 due to user demand.  
- Improved testing scope after Sprint 2 feedback.  
- Adjusted wireframes as UI evolved.  

---

# 9. Conclusion
The **planning phase** provided a structured workflow with clear sprints, risk management, and stakeholder engagement.  
This ensured the team delivered a **working, tested, and user-validated application** within 4 weeks.  


---
> 🏗 Curious how this plan looks in action with designs and diagrams?  
> Check out the [Project Design Guide](/guides/projectdesign).  
