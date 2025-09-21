---
title: Frontend Guide
description: React frontend setup and component structure.
---

# Frontend Guide

The **Sports Live** frontend is built with **React** and provides the user-facing interface for real-time sports data, match management, and reports. It integrates with Clerk for authentication and communicates with the backend API (Node.js/Express + MongoDB).

## Frontend: Technology Stack:
- **React** – component-based UI framework  
- **Vite** – fast development bundler (replaces CRA)  
- **Clerk** – authentication and user management  
- **TailwindCSS** – modern styling and UI components  

## Project Structure 
```plaintext
src/
 ├── components/
 │    ├── auth/              # Authentication pages
 │    │    └── LoginPage.js
 │    ├── dashboard/         # Main application dashboard
 │    │    └── Dashboard.js
 │    ├── sports/            # Sports-related features
 │    │    ├── LiveSports.js
 │    │    ├── EventFeed.js
 │    │    ├── LeagueStandings.js
 │    │    ├── MatchViewer.js
 │    │    └── PlayersPage.js
 │    └── reports/
 │         └── ReportsPage.js
 │
 ├── hooks/                  # Custom React hooks
 │    └── useLiveSports.js
 │
 ├── styles/                 # CSS modules for each page
 │    ├── Dashboard.css
 │    ├── PlayersPage.css
 │    ├── ReportsPage.css
 │    └── EventFeed.css
 │
 └── App.js                  # Application entry
```

## Key Components
- **Dashboard** 
- `Dashboard.js` - Central Navigation hub for the app
- **Sports** 
-  `LiveSports.js` - Displays current live matches. 
- `EventFeed.js` → Real-time updates for match events.
- `LeagueStandings.js` → Shows league tables and standings.
- `MatchViewer.js` → Detailed view of a selected match.
- `PlayersPage.js` → Lists players with search & filters.

- **Reports**
- `ReportsPage.js` → Admin view for reports, analytics, and summaries.


---
## Development Workflow

To start the frontend development server :

```bash
npm run dev
```

Build for production

```bash
npm run build
```

Preview production build locally:

```bash
npm run preview
```



## Styling

Each major page/component has a dedicated CSS file inside `src/styles/`.

- **Naming convention** → matches the component/page name.  
  - `Dashboard.js` → `Dashboard.css`  
  - `PlayersPage.js` → `PlayersPage.css`  
  - `ReportsPage.js` → `ReportsPage.css`  
  - `EventFeed.js` → `EventFeed.css`  

- **Styling tools used**:  
  - **TailwindCSS** → utility-first styling for layout and responsiveness.  
  - **shadcn/ui** → pre-styled components (buttons, inputs, cards).  
  - **Custom CSS modules** → applied where Tailwind does not cover specific design needs.  

---
## Authentication (Frontend)

Authentication is managed via **Clerk’s React SDK**.

- **LoginPage.js** provides the login and signup UI.  
- **Protected routes** ensure that only logged-in users can access sensitive pages (e.g., `ReportsPage`, `PlayersPage`).  
- The **Clerk session token** is automatically included in API requests for backend validation.  
- Unauthorized users attempting to access protected pages are redirected to the login page.  

---

## Continuous Improvement

- **Code Quality**: ESLint and Prettier enforce linting and formatting before commits.  
- **UI/UX Feedback**: Collected from stakeholders at sprint reviews to refine designs.  
- **Iterative Updates**: Styling, layouts, and component design evolve continuously based on usability testing.  
- **Consistency**: Shared design rules ensure that new features follow the same styling and accessibility patterns.  

---

## References

- [TailwindCSS](https://tailwindcss.com/docs) – Utility-first CSS framework used for layout and styling.   
- [ESLint](https://eslint.org/) – JavaScript linting tool to maintain code quality.  
- [Prettier](https://prettier.io/) – Code formatter for consistent styling.
- [Clerk React SDK](https://clerk.com/docs/references/react) – Authentication setup and session handling.    

