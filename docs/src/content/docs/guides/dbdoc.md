---
title: "Database Documentation"
description: "A guide to understanding the database schema,the deployment and the full Justification for it"
---

## 1.Choice of Database + Justification 

We use **MongoDB**  to store all core match and event data.It's **aNoSQL** document-based database, Stores data in JSON-like documents, which maps naturally to our application’s data (matches, events, teams). Authentication is handled by **Clerk**, which issues a userId. This userId is stored in MongoDB for personalization features such as favorite teams.

## 2. Deployment Information
### 2.1 Installition
Install MongoDB Node.js driver 
```bash
npm install mongodb
```

### 2.2 Connection String
Copy the following connection string, with the link to the database and the password
```bash
mongodb+srv://dybalasantiago15_db_user:<db_password>@sportslivetracker.8wemqpi.mongodb.net/?retryWrites=true&w=majority&appName=SportsLiveTracker

```
user : dybalasantiago15_db_user
password : theYYtiktoker

### 2.3 Enviroment Variables
Store the full URI in the [.env]
```bash
mongodb+srv://dybalasantiago15_db_user:theYYtiktoker@sportslivetracker.8wemqpi.mongodb.net/?retryWrites=true&w=majority&appName=SportsLiveTracker

```

### 2.4 Connecting in Node.js
Using the MongoDBdriver
```bash
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGO_URI);

async function connectDB() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");
    return client.db("sport-live-feeds");
  } catch (err) {
    console.error("❌ DB connection failed", err);
  }
}

export default connectDB;

```
## 3. Database Schema
### 3.1 Users
```bash
{
  "userID": "string (from Clerk)"
}

```
### 3.2 Favourite Teams
```bash
{
  "favID": "string (UUID)",
  "userID": "string (FK → Users.userID)",
  "teamID": "string (FK → Teams.teamID)"
}

```
### 3.3 Match_Info
```bash
{
  "matchID": "string (UUID)",
  "startTime": "datetime",
  "status": "string (scheduled, live, finished)",
  "teamIDs": ["team1ID", "team2ID"]
}

```
### 3.4 Event_Log
```bash
{
  "eventID": "string (UUID)",
  "matchID": "string (FK → MatchInfo.matchID)",
  "timestamp": "datetime",
  "type": "string (goal, foul, substitution, etc.)",
  "description": "string"
}

```
### 3.5 Display_State
```bash
{
  "displayID": "string (UUID)",
  "matchID": "string (FK → MatchInfo.matchID)",
  "homeScore": "int",
  "awayScore": "int",
  "possession": "string (teamID)",
  "gamePhase": "string (1st Half, 2nd Half, OT)",
  "clock": "string"
}

```
### 3.6 Teams
```bash
{
  "teamID": "string (UUID)",
  "name": "string"
}

```
### 3.7 Players
```bash
{
  "playerID": "string (UUID)",
  "teamID": "string (FK → Teams.teamID)",
  "name": "string",
  "position": "string"
}

```
## 4 Entity Relationship Diagram(ERD)
 ![ERD](/diagrams/erd.png)
- **Users** -> Favourite Teams ->Teams
- **Teams** -> Players
= **Match_Info** -> Event_Log + Display State 

## 5. References 
- MongoDb Documentation: [https://www.mongodb.com/docs](https://www.mongodb.com/docs)  
- Clerk Authentication Docs: [https://clerk.com/docs](https://clerk.com/docs)  
- MongoDB Node.js Driver: [https://www.mongodb.com/docs/drivers/node/current](https://www.mongodb.com/docs/drivers/node/current)  
### 5.1 Video Reference
- Youtube Video Reference : [https://www.youtube.com/watch?v=SV0o0qOmKOQ](https://www.youtube.com/watch?v=SV0o0qOmKOQs)  

