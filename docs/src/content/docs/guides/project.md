# Project Development Methodology

## **Chosen Methodology: Agile (Scrum Framework)**

We use the **Agile methodology**, following the **Scrum framework**, to ensure flexibility, collaboration, and continuous delivery of working software.

---

## **Why Agile for Sport Live Feeds?**

- Requirements may evolve after stakeholder feedback.
- Frequent delivery allows us to adapt quickly.
- Encourages transparency, communication, and accountability.
- Short iterations keep progress measurable and visible.

We work in **two-week sprints**, providing enough time for meaningful progress while maintaining rapid feedback loops.

---

## **Scrum Process**

### **Roles**

- **Product Owner** – Represents stakeholder interests and prioritizes backlog.
- **Scrum Master** – Facilitates ceremonies, removes blockers.
- **Development Team** – Builds, tests, and delivers product increments.

### **Ceremonies**

1. **Sprint Planning** – Define sprint goals, select backlog items, estimate work.
2. **Daily Standups** – Quick syncs to report progress and highlight blockers.
3. **Sprint Review** – Demo completed features to stakeholders and gather feedback.
4. **Sprint Retrospective** – Identify improvements for the next sprint.

---

## **Workflow Diagram**

`Backlog → Sprint Planning → Development → Daily Standups → Sprint Review → Retrospective → Next Sprint`

---

## **Tools Used**

- **React** – Frontend framework for building fast, responsive UI.
- **Notion** – Central hub for sprint boards, backlog, and documentation.
- **Discord** – Async communication, quick updates, and stakeholder coordination.
- **Git & GitHub** – Version control and CI/CD deployment.
- **VS Code** – Main IDE for coding and configuration.

---

## **Workflow Structure**

### Sprint Length

- Each sprint runs for **2 weeks**.

### Planning and Meetings

| Meeting              | Frequency            | Format                     | Purpose                            |
| -------------------- | -------------------- | -------------------------- | ---------------------------------- |
| **Sprint Planning**  | Every second Tuesday | In-person                  | Plan the sprint, estimate tasks    |
| **Sprint Check-ins** | 3x per week          | Discord                    | Review progress, unblock teammates |
| **Sprint Review**    | Every Day            | In-person/Discord/Whatsapp | Demo features, collect feedback    |

---

## **Proof of Agile in Action**

We maintain our project board in **Notion**:  
 [View on Notion](https://www.notion.so/Sports-Live-Tracker-2467a77b8bee80ff9843cca11627b087?source=copy_link)

Includes:

- Sprint backlog with priorities.
- Columns: `Backlog` → `To Do` → `In Progress` → `Review` → `Done`.
- Assigned tasks with due dates.
- Links to GitHub branches and PRs.
- Sprint deliverable tags.

Additional evidence:

- Meeting notes from Sprint Planning.
- Standup summaries in Discord.
- Screenshots from Sprint Reviews.
- Retrospective improvement notes.

---

## **Architecture Overview**

**Frontend** – **React**

- Renders UI components for login, dashboard, preferences, match setup, and live input.
- Fetches data from backend APIs and WebSockets for live updates.

**Backend API** – Node.js + Express

- RESTful endpoints for matches, events, and preferences.
- WebSocket support for real-time updates.

**Database** – PostgreSQL or MongoDB

- Stores match info, events, player/team data, and user preferences.

**Deployment** – GitHub Pages / Hosting via CI/CD

- Automatic build and deploy from the `main` branch.

---

## **Deployment Process**

1. **Branching Strategy**

   - Features: `feature/<name>`
   - Fixes: `fix/<name>`
   - Merge via pull requests to `main`.

2. **Build & Test**

   - `astro build` runs locally and in CI.
   - Manual QA for dashboard, event feed, and live updates.

3. **Deployment**

   - Push to `main` triggers GitHub Actions.
   - Astro build output deployed to GitHub Pages or hosting service.

4. **Post-Deployment**
   - Verify live environment against sprint goals.
   - Perform smoke tests.

---

## **References**

- Agile Manifesto: [https://agilemanifesto.org/](https://agilemanifesto.org/)
- Scrum Guide: [https://scrumguides.org/](https://scrumguides.org/)
- Astro Docs: [https://docs.astro.build/](https://docs.astro.build/)
- Atlassian Agile: [https://www.atlassian.com/agile](https://www.atlassian.com/agile)
