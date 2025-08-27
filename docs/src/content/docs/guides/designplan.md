---
title: Inital Design & Development Plan
description: Development workflow and best practices for Sports Live.
---

###  Goal
Provide a clear, structured roadmap of development milestones, including timeline, design artifacts, and responsibilities.

---

##  Roadmap with Milestones (4 Weeks)

| Week | Focus Area      | Tasks / Deliverables                                                                 |
|------|-----------------|--------------------------------------------------------------------------------------|
| 1    | Setup & Design  | - Set up GitHub repo & CI/CD <br> - Project scaffolding (React + Node + DB) <br> - UI wireframes (Figma) <br> - Architecture diagram |
| 2    | Authentication  | - Implement sign-up/login/logout <br> - Role-based access (admin, user) <br> - Connect to DB for user storage |
| 3    | Core Features   | - Live score input (admin) <br> - Real-time updates (WebSocket) <br> - Dashboard for viewers |
| 4    | Testing & Feedback | - Unit & integration tests <br> - Usability testing session <br> - Sprint Review demo <br> - Collect & apply feedback |

**Tools**: GitHub, Notion, Figma, Draw.io, Clerk/Auth0, Firebase, Express.js, React, Jest  



---

#  Design Artifacts

- **Wireframes** → UI mockups for core pages (Login, Dashboard, Match Input, Viewer)  
- **Architecture Diagram** → High-level system overview (Frontend ↔ Backend ↔ Firebase)  
- **UML Diagrams** → Use Case Diagram + Component Diagram 


#  Wireframes

 ![Wireframes](/diagrams/wiref.png)


---

## Use Case Diagram

> Shows how admins, viewers, and guests interact with the system.


![Use Case Diagram](/diagrams/use.png)

Main Use Cases:

Admin → Add/Edit/Remove Matches, Manage Users, Push Updates

Viewer → View Live Scores, Follow Teams, Receive Notifications

---
## Component Diagram

> High-level breakdown of frontend, backend, and Firebase integration.

![Component Diagram](/diagrams/component.png)

Components:
### a) Frontend (React)
- Pages (Login, Dashboard, Viewer)
- Reusable Components (MatchCard, ScoreBoard) 
- Talks to backend via REST APIs and WebSockets  

### b) Backend (Node.js + Express)
- Auth Service
- Match Service 
- Database (Firebase)
- Firestore: Matches, Users, Events


---
##  Sequence Diagram

> Example: Admin adds a goal → Viewers see it live.


![Sequence Diagram](/diagrams/sequence.png)

---
##  Data Model (ER Diagram)

> Entities: User, Team, Match, Event, Player.


![ER Model](/diagrams/class.png)

---

##  Deployment Diagram

> Local dev, Azure hosting, Firebase integration.


![Deployment Diagram](/diagrams/deployment.png)

---


---

##  System Architecture Overview

# a) Frontend (React)
- Displays live match data, timelines, and match setup forms  
- Pages: Login, Dashboard, Preferences  
- Talks to backend via REST APIs and WebSockets  

# b) Backend (Node.js + Express)
- Handles API requests from frontend  
- Manages authentication, CRUD for matches, events  
- Pushes live updates via WebSockets  

# c) Database (Firebase)
- Stores matches, events, players, teams, and user preferences  

---

##  Backend API Endpoints

# Auth
- `POST /auth/login` → User login  
- `POST /auth/signup` → Create new user  
- `POST /auth/logout` → End session  

# Matches
- `POST /matches` → Create new match  
- `GET /matches` → Get all matches  
- `GET /matches/:id` → Get single match  
- `PUT /matches/:id` → Update match info  
- `DELETE /matches/:id` → Delete match  

# Events
- `POST /matches/:id/events` → Add event (goal, foul, substitution, etc.)  
- `PUT /matches/:id/events/:eventId` → Edit event  
- `DELETE /matches/:id/events/:eventId` → Remove event  

# Feed
- `GET /matches/:id/feed` → Get current match state  
- `GET /matches/:id/timeline` → Get chronological list of events  

# Preferences
- `GET /users/:id/preferences` → Get user preferences  
- `PUT /users/:id/preferences` → Update preferences  

---

# Database Schema

**Users**  
- user_id (PK)  
- email  
- password_hash  
- favorite_teams  

**Teams**  
- team_id (PK)  
- name  
- logo_url  

**Players**  
- player_id (PK)  
- name  
- team_id (FK)  

**Matches**  
- match_id (PK)  
- home_team_id (FK)  
- away_team_id (FK)  
- start_time  
- venue  
- status (scheduled, live, paused, ended)  

**Events**  
- event_id (PK)  
- match_id (FK)  
- timestamp  
- event_type (goal, foul, substitution, etc.)  
- description  
- team_id (FK, optional)  
- player_id (FK, optional)  

---

##  Frontend Components (React)

### Pages
1. **LoginPage**  
   - Inputs: Email, Password  
   - Buttons: Sign In, Forgot Password, Sign Up  

2. **Dashboard**  
   - TopNav: Logo, User Profile, Logout button  
   - Sidebar: Links to Live Matches, Match Setup, Event Timeline, Preferences  
   - Main Area:  
     - **LiveScoreboard**: Teams, logos, score, timer, possession  
     - **EventTimeline**: Vertical list of events  
     - **MatchControlPanel**: Pause/Resume, Add Event form  

3. **PreferencesPage**  
   - Select favorite teams  
   - Choose default layout  
   - Toggle notifications  

### Reusable Components
- MatchCard  
- EventItem  
- TeamSelector  
- TimeDisplay  
- FormModal (add/edit matches/events)  

---

##  Integration Flow

1. Admin/Operator creates a match via `/matches`  
2. Operator adds live events manually via `/matches/:id/events`  
3. Backend stores the event in **Events** table  
4. Backend updates **Matches** table with new score/time  
5. Frontend fetches state via `/matches/:id/feed`  
6. WebSocket pushes live updates instantly  
7. Preferences API customizes what each user sees  

---


## Development Workflow

This guide covers the development process for the Sports Live application.

### Development Modes

**Mock Data Mode (Recommended for Development)**
```bash
npm start
```
- Uses mock sports data
- No API costs
- Fast development

**Live Data Mode (For Testing)**
```bash
npx vercel dev
```
- Uses real Football-Data.org API
- Requires API token setup
- Live sports data

### Environment Setup

Create a `.env.local` file:
```bash
REACT_APP_CLERK_PUBLISHABLE_KEY=your_clerk_key
FOOTBALL_API_TOKEN=your_football_api_token
```

### Testing

Run the test suite:
```bash
npm test
```

### Building

Create production build:
```bash
npm run build
```