# Multi-stage build for React + Node API server
# 1) Build static assets
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . ./
# Pass CRA env at build time so React can inline it
ARG REACT_APP_CLERK_PUBLISHABLE_KEY
ENV REACT_APP_CLERK_PUBLISHABLE_KEY=${REACT_APP_CLERK_PUBLISHABLE_KEY}
RUN npm run build

# 2) Runtime image with Express server
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# Copy only what's needed at runtime
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=builder /app/build ./build
COPY api ./api
COPY services ./services
COPY lib ./lib
COPY server.js ./server.js
# Port for deployment platforms
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]
