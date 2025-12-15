# Railway Deployment Fix

## Issue
Railway couldn't find build configuration.

## Solution
Added three configuration files:

### 1. `nixpacks.toml`
Tells Railway how to build the app:
- Use Node.js 20
- Install dependencies in `server/` folder
- Build TypeScript
- Start with `npm run start:v2`

### 2. `railway.json`
Railway-specific configuration:
- References nixpacks.toml
- Sets health check endpoint
- Configures restart policy

### 3. `Procfile`
Backup start command:
- Tells Railway how to start the app
- Used if other configs fail

## Deploy Again

1. **Commit changes:**
```bash
git add .
git commit -m "fix: Add Railway build configuration"
git push origin v2-fastify-supabase
```

2. **Railway will auto-redeploy**
   - Watch the logs
   - Should build successfully now

3. **If still fails, set manually in Railway:**
   - Build Command: `cd server && npm install && npm run build`
   - Start Command: `cd server && npm run start:v2`
   - Root Directory: `/`

## Expected Build Output

```
✓ Installing Node.js 20
✓ Installing dependencies
✓ Building TypeScript
✓ Starting server
✓ Health check passed
```

## Troubleshooting

If build still fails:
1. Check Railway logs for specific error
2. Verify `server/package.json` has `start:v2` script
3. Ensure `server/tsconfig.json` exists
4. Check all environment variables are set
