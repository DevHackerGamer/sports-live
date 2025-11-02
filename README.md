---
title: Sports Live Tracker
description: A modern web platform for tracking live sports feeds, scores, and stats.
---

# ⚽ Sports Live Tracker

A modern web platform for tracking live sports feeds, scores, and stats. Built with **React**, **Node.js/Express**, and **MongoDB** for real-time updates and admin management

---
![Code Coverage](https://img.shields.io/badge/coverage-81%25-yellowgreen)


## Admin Login Credintials
- email:bash_nonAdmin@gmail.com
- password :LegendStatus2
---

## 🌐 Live Links
- 🌐 Hosted Here: [Sports Live](https://sports-live.onrender.com/)
- 📄 Documentation Site [Documentation Site](https://adorable-kleicha-8ace6b.netlify.app/)
-  💻 GitHub: [Repo Link](https://github.com/DevHackerGamer/sports-live)
- 📚 Project Board (Notion): [Sprint & Task Board](https://www.notion.so/Sports-Live-Tracker-2025-25b7181e6705803aa7bdffa7190f8dfa?source=copy_link)   
---


## 🚀 Project Overview
- View live sports scores and stats
- Filter by teams, leagues, and events
- Admins can manage feeds and API connections
- Mobile-friendly and responsive UI
- Real-time score updates for live matches
- View League Tables of top Leagues

---


## 🧰 Tech Stack
- Backend: Node.js, Express, MongoDB.
- Frontend: React (functional components & hooks)
- Deployment & Dev Tools: Render, Docker, Git & GitHub, Notion (sprint boards), Discord & Whatsapp (team communication)

---
## 🔑 Core Features
- **Admin Portal:**  
  - Create and Manage Matches
  - Add/Edit/Delete Live Match Events
- **Public Interface:**  
  - Live feed display & scoreboards  
  - View Live Match Statistics & Events
  - View League Tables
  - Mobile-friendly responsive UI 
  - Watch Latest Match Highlights 
  - Read Latest Football News

---



## ⚙️ Setup Instructions
### 1. Clone the Repo

```bash
git clone https://github.com/DevHackerGamer/sports-live.git
cd sports-live
```

### 2. Install Dependencies (Backend & Frontend)

```bash
npm install
```


### 3. Run Frontend & Backend Locally

```bash
npm run dev
```

> ⚠️ Ensure your `.env` is configured with valid `REACT_APP_CLERK_PUBLISHABLE_KEY`, MONGODB_URI, and FootballData.org API keys.

---

## Data providers

Two ingest pipelines are available. The original Football-Data.org implementation remains intact, and a new ESPN-based implementation can be enabled via environment variable.

- football-data.org (default; requires `FOOTBALL_API_TOKEN`)
- ESPN public site APIs (no token required)

Configure via environment variables:

- `DATA_PROVIDER=football-data` (default) or `DATA_PROVIDER=espn`
- `ESPN_LEAGUES` (optional) comma-separated list like `ita.1,eng.1,uefa.champions`

When `DATA_PROVIDER=espn`, the server will periodically fetch:

- League scoreboard (fixtures and IDs)
- Match summary (stats/boxscore)
- Play-by-play (commentary timeline)

All data is normalized into existing MongoDB collections so existing APIs continue to work:

- `Match_Info` with normalized fields (homeTeam, awayTeam, competition, utcDate, status, score, events)
- `Match_Statistics` populated from ESPN boxscore
- `Match_Lineups` populated when available
- `Match_Commentary` stores raw ESPN commentary for reference
- `Event_Log` contains scoring events with rolling `scoreAfter`

Dev-only manual refresh:

- `GET /api/admin-refresh-matches`

---

## 👥 Team
- Fullstack Devs , Testing & QA
- Joshua Williams
- Mohau Makunyane  
- Bohlale Mabonga
- Tshepo Mngomezulu
- Kwezi Mudacumura
- Lehlohonolo Tosa
- Mentorship: University of the Witwatersrand – Software Design Project 2025

---

## 🧪 Testing & UAT
- Manual and automated User Acceptance Testing (UAT)
- CI/CD testing pipeline integrated with GitHub Actions
- Code coverage tracked via Codecov
- Unit & integration tests using Jest + React Testing Library

---


## 📋 Project Management Methodology
- **Framework:** Agile (Scrum)  
- **Sprint Length:** 2 weeks  
- **Roles:** Product Owner (prioritizes backlog), Scrum Master (removes blockers), Development Team (implements & tests features)  
- **Ceremonies:** Sprint Planning, Daily Standups, Sprint Review, Sprint Retrospective  
- **Evidence:** Notion sprint board, GitHub PRs linked to tasks, Discord standup notes  
- **Rationale:** Allows rapid feedback, adapts to changing requirements, ensures accountability  
- **References:** [Scrum Guide 2020](https://www.scrumguides.org/scrum-guide.html)

---

## 📄 License
- Academic project under Wits University’s Software Development Project module

---

## 🙌 Contributions
- Pull requests and feedback welcome. Open an issue or fork the repo to contribute

---

## 📚 Resources
- [React Documentation](https://reactjs.org/)  
- [Tailwind CSS](https://tailwindcss.com/)
---

# Folder Structure

- `src/` – React app UI (Live scoreboard, event feed, match setup, etc.)
- `api /` – REST APIs for live updates, match metadata, and feed delivery
- `docs/` – Sprint planning, setup instructions, team roles, methodology



---

# Documentation 

For the full documentation of the website visit:

https://adorable-kleicha-8ace6b.netlify.app/

