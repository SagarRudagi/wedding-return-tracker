# Wedding Return Tracker (Multi-User)

This app now supports shared updates across multiple users and locations.

## What Changed

- Data is stored in Supabase instead of browser localStorage.
- Users can create a shared workspace and join using a workspace code.
- Item and collaborator changes sync for everyone connected to the same workspace.
- Realtime subscriptions keep each browser updated when someone else makes changes.

## 1) Supabase Setup

1. Create a new Supabase project.
2. Open SQL Editor in Supabase.
3. Run the script in [supabase/schema.sql](supabase/schema.sql).
4. In Supabase project settings, copy:
	- Project URL
	- anon public key

## 2) Local Environment

1. Copy `.env.example` to `.env`.
2. Fill in:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

3. Install and run:

```bash
npm install
npm run dev
```

## 3) Deploy on Vercel

Set these environment variables in Vercel for Production (and Preview if needed):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Then deploy:

```bash
npm run release
```

This runs the production build and deploys with the existing Vercel config.

## Notes

- Without Supabase env vars, the app shows a setup screen.
- Current RLS policies in `schema.sql` are open for easy collaboration. For stricter security, add auth and user-specific policies.
