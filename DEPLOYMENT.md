# Deployment Guide

## Architecture

- **Backend**: Cloudflare Workers with Durable Objects
- **Frontend**: Cloudflare Pages (static site)
- **Shared Package**: TypeScript types shared between frontend and backend

## Important Notes on Shared Package

The `@plaza/shared` package is a **development-time only** dependency:

- **Frontend**: Vite bundles the types during build, so the shared package is NOT needed at runtime
- **Backend**: Cloudflare Workers bundles everything, so the shared package is NOT needed at deployment

### How it works:

1. During development, both frontend and backend import from `@plaza/shared`
2. At build time:
   - **Frontend**: Vite resolves the workspace dependency and inlines the types
   - **Backend**: Wrangler bundles the types directly into the worker script

3. The final deployed artifacts do NOT require `@plaza/shared` to exist

## Deploying Backend (Cloudflare Workers)

```bash
cd backend
pnpm deploy
```

This will:
1. Bundle `src/index.ts` with all dependencies
2. Deploy to Cloudflare Workers
3. The Durable Object binding is configured in `wrangler.toml`

**Note**: The `@plaza/shared` package will be bundled into the worker script automatically.

## Deploying Frontend (Cloudflare Pages)

### Option 1: Using Cloudflare Pages Dashboard

1. Connect your GitHub repository to Cloudflare Pages
2. Set build configuration:
   - **Build command**: `cd frontend && pnpm build`
   - **Build output directory**: `frontend/dist`
   - **Root directory**: (leave as repository root)
   - **Node version**: 18 or higher

3. Set environment variable (if needed):
   - `VITE_WS_URL`: Your backend WebSocket URL (e.g., `wss://your-worker.workers.dev/ws`)

### Option 2: Using Wrangler CLI

```bash
cd frontend
pnpm build
npx wrangler pages deploy dist --project-name=plaza-frontend
```

## Environment Variables

### Frontend (Production)

If you need to override the WebSocket URL for production:

Create `frontend/.env.production`:

```env
VITE_WS_URL=wss://your-backend-worker.workers.dev/ws
```

Then update `App.tsx`:

```typescript
const WS_URL = import.meta.env.VITE_WS_URL || 
  (import.meta.env.DEV
    ? "ws://localhost:8788/ws"
    : `wss://${window.location.host}/ws`);
```

## Monorepo Structure Benefits

✅ **No impact on deployment**:
- Each package is deployed independently
- Build tools bundle dependencies automatically
- No workspace dependencies in production

✅ **Type safety**:
- Shared types ensure frontend/backend compatibility
- Changes to message types are reflected immediately

✅ **Development experience**:
- Single `pnpm install` for all packages
- Hot reload works across packages
- TypeScript intellisense across workspace

## Verification

After deployment:

1. Backend health check: `https://your-worker.workers.dev/` should return "Plaza backend OK"
2. WebSocket test: Use a WebSocket client to connect to `wss://your-worker.workers.dev/ws`
3. Frontend: Should load and connect automatically to the backend

## Cost Considerations

- **Workers**: Free tier includes 100,000 requests/day
- **Durable Objects**: Free tier includes 1,000,000 requests/month
- **Pages**: Free tier includes unlimited static requests
