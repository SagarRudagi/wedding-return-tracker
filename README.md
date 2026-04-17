# Wedding Return Tracker

Multi-user wedding purchase and returns tracker built with React, Vite, and Supabase.

## Overview

Wedding Return Tracker helps teams track purchased items, deadlines, and return status in one shared workspace.

Key capabilities:

- Shared workspaces using a join code.
- Realtime sync across multiple users, devices, and locations.
- Return status workflow (`ordered` -> `delivered` -> `in_use` -> `return_initiated` -> `returned`).
- Urgency highlights for soon-to-expire return windows.
- Bulk status updates, CSV export, and printable records.

## Tech Stack

- Frontend: React 18 + Vite
- Data + Realtime: Supabase Postgres + Realtime
- Date handling: dayjs
- Hosting: Vercel

## Project Structure

```text
src/
	App.jsx                  # Main UI and app logic
	lib/supabaseClient.js    # Supabase initialization
supabase/
	schema.sql               # Required DB schema and RLS policies
```

## Prerequisites

- Node.js 18+
- npm 9+
- A Supabase project
- A Vercel account (for deployment)

## Environment Variables

Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Set values:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create database objects in Supabase:

- Open Supabase SQL Editor.
- Run [supabase/schema.sql](supabase/schema.sql).

3. Start dev server:

```bash
npm run dev
```

4. Open the app, create a workspace, and share the workspace code with collaborators.

## Available Scripts

- `npm run dev` - start local dev server
- `npm run build` - create production build
- `npm run preview` - preview production build locally
- `npm run lint` - run ESLint
- `npm run deploy:prod` - deploy to Vercel production
- `npm run release` - build and deploy production

## Supabase Setup Details

The app requires these tables:

- `public.workspaces`
- `public.workspace_members`
- `public.return_items`

All are created by [supabase/schema.sql](supabase/schema.sql), including basic RLS and realtime publication setup.

## Deployment (Vercel)

### Option A: Vercel Dashboard

1. Import this GitHub repository in Vercel.
2. Set environment variables for **Production**, **Preview**, and **Development**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

3. Deploy.

### Option B: Vercel CLI

From project root:

```bash
npx vercel@32.6.1 env add VITE_SUPABASE_URL production
npx vercel@32.6.1 env add VITE_SUPABASE_ANON_KEY production
npx vercel@32.6.1 env add VITE_SUPABASE_URL preview
npx vercel@32.6.1 env add VITE_SUPABASE_ANON_KEY preview
npx vercel@32.6.1 env add VITE_SUPABASE_URL development
npx vercel@32.6.1 env add VITE_SUPABASE_ANON_KEY development
npm run release
```

`deploy:prod` supports both cases:

- with `VERCEL_TOKEN` set
- with a logged-in CLI session

## Usage Flow

1. Open app.
2. Click **Create Workspace** (or enter an existing workspace code).
3. Add items and update statuses.
4. Open same workspace from another browser/device to verify realtime sync.

## Troubleshooting

### Error: Could not find the table 'public.workspaces' in the schema cache

Cause: Supabase schema is missing (or created in a different project).

Fix:

1. Run [supabase/schema.sql](supabase/schema.sql) in the same project used by `VITE_SUPABASE_URL`.
2. Reload PostgREST schema cache:

```sql
select pg_notify('pgrst', 'reload schema');
```

3. Verify tables:

```sql
select to_regclass('public.workspaces');
select to_regclass('public.workspace_members');
select to_regclass('public.return_items');
```

If any return `null`, rerun schema creation in the correct project.

### App shows setup screen about missing env vars

Your deployment does not have one or both variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Add them in Vercel Project Settings -> Environment Variables and redeploy.

## Security Note

The included RLS policies are intentionally open for quick team collaboration and demo use.
For production-grade access control, add Supabase Auth and tighten policies per user/workspace membership.
