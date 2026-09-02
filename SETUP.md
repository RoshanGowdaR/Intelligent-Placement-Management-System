# Local Development Setup Guide

This guide walks you through running the **Intelligent Placement Management System** locally in VS Code with full functionality.

## Prerequisites

- **Node.js** v18+ (recommended: use [nvm](https://github.com/nvm-sh/nvm))
- **npm** v9+ (comes with Node.js)
- **Git**
- **VS Code** (recommended extensions below)
- **Supabase CLI** ([install guide](https://supabase.com/docs/guides/cli/getting-started))
- A **Supabase project** (free tier works) — or use existing project credentials

## Recommended VS Code Extensions

- ESLint
- Tailwind CSS IntelliSense
- Prettier
- TypeScript + JavaScript
- Deno (for edge function development)

## Step 1: Clone the Repository

```bash
git clone <YOUR_GIT_URL>
cd "Intelligent Placement Management System"
```

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Configure Environment Variables

Create a `.env` file in the project root (or copy the existing one):

```env
VITE_SUPABASE_URL="https://<your-project-id>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<your-supabase-anon-key>"
VITE_SUPABASE_PROJECT_ID="<your-project-id>"
```

> **Where to find these values:**
> Go to your Supabase project dashboard → Settings → API. Copy the **Project URL** and **anon/public key**.

## Step 4: Set Up the Database

### Option A: Using Supabase CLI (recommended)

```bash
# Link to your Supabase project
supabase link --project-ref <your-project-id>

# Apply all migrations
supabase db push
```

### Option B: Manual SQL

Navigate to the Supabase SQL Editor in your project dashboard and run each migration file from `supabase/migrations/` in order (sorted by timestamp).

## Step 5: Configure Edge Function Secrets

In your Supabase project dashboard, go to **Settings → Edge Functions → Secrets** and add:

| Secret Name | Value |
|-------------|-------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key (Settings → API → service_role key) |
| `SUPABASE_ANON_KEY` | Your anon key |
| `RESEND_API_KEY` | Your Resend API key for email notifications |

> **For AI features** (question generation, feedback): You'll also need a `LOVABLE_API_KEY`. If you don't have one, those features will gracefully degrade — tests can still be created manually.

## Step 6: Deploy Edge Functions

```bash
# Deploy all edge functions
supabase functions deploy extract-questions-pdf
supabase functions deploy generate-feedback
supabase functions deploy generate-questions
supabase functions deploy send-company-notification
supabase functions deploy send-email
supabase functions deploy send-reset-code
supabase functions deploy send-result-notification
supabase functions deploy send-test-notification
supabase functions deploy verify-markscard
supabase functions deploy verify-reset-code
```

Or deploy all at once:

```bash
supabase functions deploy
```

## Step 7: Create Storage Buckets

In the Supabase dashboard, go to **Storage** and create two buckets:

1. **resumes** (private)
2. **markscards** (private)

> These may already exist if migrations were applied successfully.

## Step 8: Create an Admin User

1. Start the app and sign up with an email/password
2. The system auto-creates a student role
3. To promote to admin, run this SQL in the Supabase SQL Editor:

```sql
-- Replace with the actual user's ID from auth.users
UPDATE public.user_roles
SET role = 'admin'
WHERE user_id = '<user-uuid-here>';
```

Or insert a new admin role:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('<user-uuid-here>', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

## Step 9: Run the Development Server

```bash
npm run dev
```

The app will be available at **http://localhost:8080**.

## Step 10: Run Tests

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Lint with ESLint |

## Project Structure

```
├── public/              # Static assets
├── src/
│   ├── components/      # React components
│   ├── hooks/           # Custom hooks
│   ├── integrations/    # Supabase client & types
│   ├── lib/             # Utilities
│   ├── pages/           # Route pages (admin/ and student/)
│   ├── App.tsx          # Root component with routing
│   ├── main.tsx         # Entry point
│   └── index.css        # Tailwind + design tokens
├── supabase/
│   ├── config.toml      # Supabase config
│   ├── migrations/      # SQL migrations
│   └── functions/       # Deno edge functions
├── .env                 # Environment variables
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

## Troubleshooting

### "Invalid API key" or auth errors
- Double-check `.env` values match your Supabase project
- Ensure `VITE_SUPABASE_PUBLISHABLE_KEY` is the **anon** key, not the service role key

### Edge functions returning 500
- Verify secrets are configured in Supabase dashboard
- Check function logs: `supabase functions logs <function-name>`

### Database permission errors
- Ensure RLS policies are applied (run all migrations)
- Verify the user has the correct role in `user_roles`

### Port 8080 already in use
- The dev server uses port 8080 by default. Kill existing processes or change the port in `vite.config.ts`

### Styles not loading
- Run `npm install` again to ensure Tailwind is installed
- Check that `postcss.config.js` and `tailwind.config.ts` exist

## Building for Production

```bash
npm run build
```

Output will be in the `dist/` folder. Deploy to any static hosting (Vercel, Netlify, Cloudflare Pages, etc.).

> **Note:** Edge functions must be deployed to Supabase separately using `supabase functions deploy`.
