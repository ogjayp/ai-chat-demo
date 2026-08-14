# AI Chat App

A signed-in AI chat demo with persistent conversations.

**Stack**
- Next.js
- Tailwind CSS
- Shadcn UI
- AI SDK by Vercel
- AI Elements by Vercel
- AI Gateway by Vercel

**Services**
- Vercel — frontend hosting
- Convex — database and backend
- Clerk — authentication

## Prerequisites

- Node.js 20+
- A [Clerk](https://dashboard.clerk.com/) account
- A [Convex](https://dashboard.convex.dev/) account
- A [Vercel](https://vercel.com/) account (AI Gateway key, and hosting if you deploy)

## Clone and install

```bash
git clone https://github.com/ogjayp/ai-chat-demo.git
cd ai-chat-demo
npm install
cp .env.example .env.local
```

## Local environment

Fill in `.env.local`. Convex will write a few of these for you when you first run `npx convex dev`.

| Variable | Where it lives | Where to get it |
| --- | --- | --- |
| `AI_GATEWAY_API_KEY` | `.env.local` | [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `.env.local` | Clerk Dashboard → API keys |
| `CLERK_SECRET_KEY` | `.env.local` | Clerk Dashboard → API keys |
| `CONVEX_DEPLOYMENT` | `.env.local` | Written by `npx convex dev` |
| `NEXT_PUBLIC_CONVEX_URL` | `.env.local` | Written by `npx convex dev` |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | `.env.local` | Convex Dashboard → Settings → URL ending in `.convex.site` |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex env | Clerk Frontend API URL, e.g. `https://your-app.clerk.accounts.dev` |
| `CLERK_WEBHOOK_SECRET` | Convex env | Clerk webhook signing secret (see below) |

### 1. Clerk

1. Create a Clerk application.
2. Copy the publishable and secret keys into `.env.local`.
3. In Clerk → JWT templates, create a template named **`convex`**. Convex's default claims are fine.
4. Copy the **Frontend API URL** (Clerk JWT issuer). You will set this as `CLERK_JWT_ISSUER_DOMAIN` on Convex.

### 2. Convex

In a terminal:

```bash
npx convex dev
```

Log in, create a project if prompted, and leave this running. It writes `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` into `.env.local`.

Then set Convex environment variables (dev deployment):

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://your-app.clerk.accounts.dev
```

Leave `CLERK_WEBHOOK_SECRET` until after you create the webhook.

### 3. Clerk webhook

1. In Clerk → Webhooks, add an endpoint:
   `https://<your-dev-deployment>.convex.site/clerk-users-webhook`
2. Subscribe to `user.created`, `user.updated`, and `user.deleted`.
3. Copy the signing secret and set it on Convex:

```bash
npx convex env set CLERK_WEBHOOK_SECRET whsec_...
```

Also copy the `.convex.site` URL into `NEXT_PUBLIC_CONVEX_SITE_URL` in `.env.local`.

### 4. AI Gateway

Create an AI Gateway API key in Vercel and set `AI_GATEWAY_API_KEY` in `.env.local`. Chat uses `anthropic/claude-sonnet-4.6` via the gateway (`lib/chat.ts`).

## Run locally

Use two terminals:

```bash
npx convex dev
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in, and send a message.

## Push to production

Production is two deploys: Convex (backend) and Vercel (frontend).

### 1. Convex production

```bash
npx convex deploy
```

Set production Convex env vars (use your **production** Clerk issuer and webhook secret):

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://your-prod-clerk-domain --prod
npx convex env set CLERK_WEBHOOK_SECRET whsec_... --prod
```

In Clerk (production instance or production keys), add a webhook to:

`https://<your-prod-deployment>.convex.site/clerk-users-webhook`

Subscribe to the same user events as local. Keep a JWT template named **`convex`**.

### 2. Vercel frontend

1. Import [this GitHub repo](https://github.com/ogjayp/ai-chat-demo) into Vercel, or push to a repo already connected to a Vercel project.
2. Set these Vercel environment variables for Production:

   - `AI_GATEWAY_API_KEY`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_CONVEX_URL` — the **production** Convex URL (`.convex.cloud`)
   - `NEXT_PUBLIC_CONVEX_SITE_URL` — the **production** Convex site URL (`.convex.site`)

3. Push to `master` (or merge to your production branch). Vercel builds with `npm run build` and deploys the Next.js app.

To have Vercel deploy Convex on every production build, add a Convex production deploy key as `CONVEX_DEPLOY_KEY` in Vercel and change the build command to:

```bash
npx convex deploy --cmd 'npm run build'
```

After that, `git push` to the connected branch is enough for both the frontend and the Convex backend.
