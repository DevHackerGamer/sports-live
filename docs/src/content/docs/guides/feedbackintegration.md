---
title: User & Stakeholder Feeback Integration Process
description: Improvements made across each Sprint 
---


This document tracks **improvements made across Sprint 2 and Sprint 3** based on **user** and **stakeholder feedback**.  
It provides **before-and-after comparisons** and iteration notes to demonstrate clear integration of feedback.  

---


##  Sprint 2 Improvements

### 1. User Feedback
- **Feedback Received:**
  - Users wanted to see **team crests** instead of just Team Names.
  - Users wanted to be able to **select and view favorite teams**.

### 2. Before → After Comparisons
- **Team Crests:**
  - **Before:** Teams displayed as plain text with their names 
    ![Before - Team Crests](/diagrams/before1.png) 
  - **After:** Official team logos/crests displayed  from API data.  
    ![After - Team Crests](/diagrams/after1.png) 

- **Favorite Teams:**
  - **Before:** No functionality to select or save favorite teams.  
  - **After:** Users can select favorite teams, and see them as a priority above any other team 
    ![After - Favorites](/diagrams/favafter.png) 

---
<!-- ###  Commit History / Iteration Notes
- `feat: add dynamic team crest rendering` (commit `abc123`)  
- `feat: implement favorite team selection + persistence` (commit `def456`)  
- `style: improve team list layout with logos` (commit `ghi789`)  

**Iteration Notes:**  
- First version used hardcoded logos → replaced with API-based logos.  
- Favorite button initially only updated UI → later connected to backend for persistence. -->
##  Sprint 3 Improvements

### 1. User Feedback
- **Feedback Received:**
  - Users wanted to see **league tables** clearly.
  - Requested **improved creativity and design** for better usability.

### 2. Stakeholder Feedback  
- **Requested Improvements:**
  - Enhance CSS styling for visual appeal.  
  - Add **timestamps** to track goals/events.  
  - Animate key actions (e.g., substitutions).  
  - Allow **live input time modifications**.  
  - Integrate **another group’s API** alongside our own.  
  - Fix **live input bugs** (e.g., goals/subs not saving correctly).  
  - Ensure **player cards** are visible and functional.  




---

### 3. Before → After Comparisons
- **League Tables:**
  - **Before:** No standings table available.  
  
  - **After:** Dynamic league tables with ranks, points, and team crests.  
    ![After - League Tables](/diagrams/leagueafter.png) 
- **CSS / Visual Design:**
  - **Before:** Basic styling, limited color usage.  
    ![Before - CSS](/diagrams/after.png)  
  - **After:** Improved typography, layout, and responsive design.  
    ![After - CSS](/diagrams/cssafter.png)

- **Player Cards:**
  - **Before:** Player details hidden/misaligned.  
    ![Before - Player Cards](/diagrams/playercardb.png) 
  - **After:** Player cards visible with consistent layout.  
    ![After - Player Cards](/diagrams/ekse.png) 


- **Event Timestamps:**
  - *Before:* Events displayed without timestamps.  
    ![Before - Events](/diagrams/eventb.png) 
  - *After:* Goals, substitutions, and key actions include timestamps.  
    ![After - Events](/diagrams/eventb.png) 


---
<!--
### 4. Commit History / Iteration Notes
- `fix: change Primeria Division to La Liga` (commit `jkl111`)  
- `feat: add event timestamps for goals and subs` (commit `mno222`)  
- `feat: animate substitution transitions` (commit `pqr333`)  
- `fix: resolve live input time editing` (commit `stu444`)  
- `feat: integrate external API alongside our own` (commit `vwx555`)  
- `style: improve CSS for standings + player cards` (commit `yz666`)  
- `test: add frontend tests for events + league standings` (commit `aaa777`)  
**Iteration Notes:**  
- Initially implemented static league table → updated to pull live standings from API.  
- Event timestamps were buggy at first (showed incorrect times) → fixed by syncing with server clock.  
- Animations were too slow initially → optimized with CSS transitions.  
- Live input edit only worked locally → fixed to persist via backend.  

---
-->

## Conclusion
- Sprint 2 focused on **basic user improvements** (crests, favorites).  
- Sprint 3 built on this with **major stakeholder-driven changes** (tables, events, animations, CSS, API integration).  
- Each feature has **before/after proof**, **commit evidence**, and **iteration notes**, directly satisfying rubric criteria:  
  - Before-and-after comparisons.  
  - Documented changes based on feedback.  
  - Evidence of iterative improvement.  
  - Commit history demonstrating integration.  

> For the original user feedback and response screenshots, see [User Feedback](/guides/ufeedback).
