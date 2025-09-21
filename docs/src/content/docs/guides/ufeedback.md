---
title: User Feedback
description: Tools and guidelines for maintaining code quality in the project.
---
## 1. Feedback Collection Process
For Sprint 2, we implemented a **formal user feedback process** using **Google Forms**.  
The survey was distributed to classmates,family members and early testers of the system.
- **Google Form Link** [Google Form Link](https://docs.google.com/forms/d/e/1FAIpQLSdsmVo4ieYDYNuOySYeTuYOd8mSVJHRGRu1p079odEO8CoeDg/viewform?usp=sharing&ouid=107333351345523887718) 

- **Google Form Sheet Summary** 
  [Google Form Sheet Summary](https://docs.google.com/spreadsheets/d/1OJ0F0wF-90pgAndp-KFst93386JLO5qEc5jY44XFqcA/edit?resourcekey=&gid=1432161762#gid=1432161762)  

The form included both **Scaled** and **Text** questions:

- **Scaled**  
  - On a scale of 1–5, how easy was it to use the event creation feature?  
  - On a scale of 1–5, how responsive was the application during your testing?  
  - On a scale of 1–5, how visually clear was the timeline of events?  

- **Text**  
  - What feature did you find most useful?  
  - What challenges did you face while using the app?  
  - What improvements or new features would you suggest?  

---

## 2. Formal Feedback Collection Process

- **Tool Used**: Google Forms  
- **Distribution**: Shared via WhatsApp groups, email to familiy members/friends,
- **Response Window**: Open for **still open** for Sprint 3 
- **Sample Size**: We got more than 20 respones  
- **Data Export**: Responses exported to **Google Sheets** for structured analysis.  
---

## 3. Feedback Analysis
After reviewing all open-ended answers, we grouped feedback into key themes:
- **Admin Match Set-up not displaying after refresh** → Some admin's match create not permanently storing the match
- **Favourite teams selected disappreared after logging out** → Some favourite teams dissapeared.   
- **Creativity & Design** → Website design is poor, team icons (badges not displaying) 
 

---

<!-- ### 4.1 Scaled Question Summary

| Question | Average Rating (1–5) |
|-------------------------------------------|------------------|
| Ease of using the event creation feature | 4.2              |
| Application responsiveness during testing | 4.0              |
| Clarity of event timeline visualisation   | 3.8              |

> This table shows that the app is generally intuitive and responsive, but visual clarity could be improved.
-->
---
## 4. Evidence of Integration
We integrated this feedback directly into Sprint 2 planning and development:

- **Admin Match Set-up Issue** : Fixed a bug in match creation where match data was not persisting in the database after a page refresh. We added backend validation and ensured all matches are saved and retrieved correctly.

- **Favourite Teams Disappearing** : Updated the user preferences module to reliably store and retrieve favourite teams across sessions.

- **Design and Visual Improvements** : Refreshed UI layout to improve visual hierarchy and usability. Team badges now display correctly after fixing image path issues and loading logic. 

---

## 5. Supporting Evidence
- ### 5.1 Screenshots
  - **Before/After UI & Favourite Team Changes** → Improvements based on feedback  
  - **Before:** ![UI Before](/diagrams/before.png)
  - **After:** ![UI After](/diagrams/after.png)



---

