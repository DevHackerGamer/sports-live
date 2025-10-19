---
title: API Endpoints
description: Documentation for Sports Live API endpoints.
---

## API Endpoints

The Sports Live application provides several API endpoints for accessing sports data and system information.

### Sports Data

**GET** `/api/sports-data`
- Fetches live and upcoming football match data
- Returns JSON with game information including scores, teams, and status

### System Status

**GET** `/api/status`
- Returns system health status
- Used for monitoring and uptime checks

**GET** `/api/uptime`
- Provides system uptime and performance metrics

### Example Endpoint

**GET** `/api/joke`
- Demo endpoint that returns a random programming joke

All endpoints are serverless functions deployed on Vercel.
