# Sports Feed Development Guide

Welcome! Please follow these instructions when running the application locally:

## Development Servers

### 1. Mock Server (No API Usage)
To run the app with mock API calls (no real API usage):

```bash
npm start
```

This will start a development server using mock data, which helps avoid unnecessary API requests during development.

### 2. API Server (With Real API Calls)
To run the app with real API calls:

```bash
npx vercel dev
```

This will start a development server that connects to the actual APIs.

### 3. Combined Dev (React + Local API Proxy)
To run React and a small local proxy that maps `/api/*` to the handlers in `api/`:

```bash
npm run dev
```

This starts:
- React dev server on http://localhost:3000
- Express proxy on http://localhost:3001

You can call API endpoints via the React app at:
- http://localhost:3000/api/joke
- http://localhost:3000/api/sports-data
- http://localhost:3000/api/status
- http://localhost:3000/api/uptime

Troubleshooting:
- If you see `Cannot find module dev-proxy-server.js`, ensure the file exists in the repo root.
- If port 3001 is in use, run `PROXY_PORT=4001 npm run dev` to use a different proxy port.
- Requires Node 18+ for dynamic import used by the proxy.

## Notes

- Use `npm start` for most development tasks to conserve API usage.
- Only use `npx vercel dev` when you need to test with real API data.

## Azure Deployment

**Note: There are currently subscription limitations preventing deployment to Azure. Please use the alternative deployment options below.**

### Alternative Deployment Options

#### Option 1: Create a deployment package

This will create a ZIP file that can be deployed to any Node.js hosting provider:

```bash
./create-deployment-package.sh
```

This creates a `sports-live-deployment.zip` file that contains everything needed to run the application.

#### Option 2: Use Docker locally or on any server

Run the application using Docker Compose:

```bash
docker-compose up -d
```

#### Option 3: Deploy to alternative cloud providers

The application can be deployed to other cloud providers that support Node.js or Docker:

1. **Heroku**:
   - Install Heroku CLI
   - Run `heroku create`
   - Run `git push heroku main`

2. **DigitalOcean App Platform**:
   - Connect your GitHub repository
   - Select Node.js as the runtime
   - Configure the build and run commands

3. **Render**:
   - Connect your GitHub repository
   - Create a new Web Service
   - Set the build command to `npm install && npm run build`
   - Set the start command to `node server.js`

#### Option 4: Run locally

```bash
npm install
npm run build
node server.js
```

The application will be available at http://localhost:8080

## Troubleshooting Azure Deployment

If you encounter deployment issues with Azure:

1. **Subscription Region Restrictions**: 
   Your Azure subscription has several limitations:
   - Policy restrictions limiting to specific regions
   - Additional subscription limitations preventing deployment even to the allowed regions
   
   Until these issues are resolved at the subscription level, please use the alternative deployment options above.

2. **For Azure Administrators**:
   To resolve these issues, you may need to:
   - Check if the subscription has region quotas or restrictions
   - Verify that the resource providers are registered
   - Ensure the subscription has sufficient permissions to create resources
   - Contact Azure support with the error message: "This subscription is not allowed for the region"

If you have any questions, please reach out to me (Josh).

## Deploy to Azure (Container)

This app can run as a single container that serves the React build and the `/api/*` endpoints via an Express server.

Why this container? Azure Web App for Containers expects your app to listen on the `PORT` env var. Our server (`server.js`) serves the built React app and mounts the API handlers so everything runs in one container.

### Build locally

Provide the Clerk publishable key at build time so React can inline it:

```bash
docker build \
	-t sports-live:latest \
	--build-arg REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_xxx \
	.

docker run --rm -p 8080:8080 \
	-e FOOTBALL_API_TOKEN=your_football_api_token \
	sports-live:latest
```

Then open http://localhost:8080.

Notes:
- Build-time: `REACT_APP_CLERK_PUBLISHABLE_KEY` is for client-side (public) use and is baked into the bundle.
- Runtime: Set `FOOTBALL_API_TOKEN` (server-only) at container runtime or in Azure App Settings.

### Push to Azure Container Registry (ACR) and deploy

```bash
# Create ACR if needed
az acr create -g <resource-group> -n <acrName> --sku Basic
az acr login -n <acrName>

# Tag and push
docker tag sports-live:latest <acrName>.azurecr.io/sports-live:latest
docker push <acrName>.azurecr.io/sports-live:latest

# Create Web App for Containers (Linux)
az webapp create -g <resource-group> -p <appservice-plan> \
	-n <app-name> --runtime "NODE:20-lts" --deployment-container-image-name <acrName>.azurecr.io/sports-live:latest

# Configure container settings
az webapp config container set -g <resource-group> -n <app-name> \
	-i <acrName>.azurecr.io/sports-live:latest -r https://<acrName>.azurecr.io

# App settings (runtime env)
az webapp config appsettings set -g <resource-group> -n <app-name> \
	--settings FOOTBALL_API_TOKEN=your_football_api_token
```

Azure will set `PORT` automatically; the server listens on that value (defaults to 8080 locally).

## Deploy to Azure App Service (ZIP)

If you prefer Azure App Service (Windows Free tier supported), deploy the Node server + built React assets via ZIP. We provide scripts that set app settings and package the right files.

### Requirements
- Azure CLI logged in (`az account show`)
- Resource Group and App Service name
- Env values:
	- REACT_APP_CLERK_PUBLISHABLE_KEY (public, required at build-time)
	- FOOTBALL_API_TOKEN (server-side, runtime)

### 1) Provision App Service (Free F1, Windows, region example: centralindia)

```bash
./scripts/deploy-azure-appservice.sh <resourceGroup> <planName> <appName> \
	--location <allowed-region> \
	--sku F1 \
	--clerk <publishableKey> \
	--football <apiToken>
```

Notes:
- Your subscription may restrict regions/SKUs. Use an allowed region (e.g., centralindia, uaenorth, southafricanorth, brazilsouth, brazilsoutheast).
- On Windows App Service, `web.config` routes traffic to `server.js` via iisnode.

### 2) Deploy via ZIP

Option A — Build on Azure (simple, slower):
```bash
./scripts/deploy-azure-zip.sh <resourceGroup> <appName> \
	--clerk <publishableKey> \
	--football <apiToken>
```

Option B — Local build (recommended on Windows):
```bash
./scripts/deploy-azure-zip.sh <resourceGroup> <appName> \
	--clerk <publishableKey> \
	--football <apiToken> \
	--local-build
```

What the script does:
- Sets WEBSITE_NODE_DEFAULT_VERSION=~20 and SCM_DO_BUILD_DURING_DEPLOYMENT (when not local-build)
- Ensures Clerk key is available for the CRA build
- Packages server.js, api/, build/, package*.json, and web.config (with --local-build)

### Verify

```bash
az webapp log tail -g <resourceGroup> -n <appName>
```

Open:
- https://<appName>.azurewebsites.net/
- https://<appName>.azurewebsites.net/api/status
- https://<appName>.azurewebsites.net/api/sports-data

### Troubleshooting
- 404 on root/static assets (Windows): ensure `web.config` is deployed or use `--local-build` packaging.
- App crashes on wildcard route: Express v5 requires regex fallback. We use `app.get(/^\/(?!api\/).*/, ...)`.
- `Missing Publishable Key`: set REACT_APP_CLERK_PUBLISHABLE_KEY in App Settings (ZIP) or pass via `--clerk`.
- `fetch is not defined`: ensure Node >=18. We set WEBSITE_NODE_DEFAULT_VERSION=~20.