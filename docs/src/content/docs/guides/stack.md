---
title: Technology Stack
description: Overview of the tools and technologies used in LiveSportUpdates.
---

This project is built using modern web technologies optimized for real-time responsiveness, scalability, and developer productivity. The stack was selected to support low-latency updates, modular architecture, and rapid development.

---

## Frontend

| Technology            | Rationale                                                                                                                           |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **React**             | Enables a component-based architecture for building dynamic, interactive user interfaces such as scoreboards and event timelines.   |
| **Vite**              | Provides a fast development server and optimized build output, significantly improving development speed and performance.           |
| **JavaScript (ES6+)** | Offers broad browser compatibility and native support for asynchronous operations, which are essential for real-time data handling. |

---

## Backend

| Technology                       | Rationale                                                                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Firebase Functions**           | A serverless backend platform that allows scalable execution of event-driven logic, ideal for processing live match data and stat events.         |
| **Firestore (NoSQL)**            | A real-time database that supports live synchronization between the server and clients. Well-suited for updating scores, events, and game states. |
| **Node.js (underlying runtime)** | Supports non-blocking, asynchronous operations, which is essential for real-time event handling in Firebase Functions.                            |

---

## Hosting

| Platform                                | Rationale                                                                                                |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Netlify hosting (for Documentation)** | Quick and easy setup.Easier then alternatives (i.e github pages) when deploying Astro files              |
| **Microsoft Azure**                     | Selected based on team familiarity and institutional support. Suitable for static hosting of our website |

---

## Documentation Tooling

| Tool                | Rationale                                                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Astro.js**        | A performant static site generator that enables efficient delivery of documentation written in Markdown, with clean routing and fast builds.    |
| **Starlight Theme** | Provides structured navigation, a clean user interface, and responsive design. Recommended by tutors and well-supported by the Astro ecosystem. |

---

## Why This Stack

The technology stack was chosen to meet the following core project requirements:

- Real-time synchronization for live sports data
- Fast UI updates and responsive client interfaces
- Scalable backend logic with minimal infrastructure overhead
- Rapid development with modern tooling and frameworks
- Compatibility with contributor skill sets and institutional support

Firebase and Firestore provide a reliable real-time backbone. React and Vite ensure high-performance rendering on the frontend. Astro and Starlight enable maintainable, performant documentation, while Git-based workflows and agile practices ensure efficient team collaboration.

This stack enables both technical performance and organizational alignment with project goals.
