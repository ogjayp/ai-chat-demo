# Write-up

I built this in Cursor over one afternoon. I used the agent for almost all of the implementation, and used a stronger review pass (Fable) when something felt off. I did not treat the model as the product owner: I picked the stack, the routes, and when to cut a feature.

## How I worked with the tool

**Prompting.** I kept prompts short and sequential. First the boilerplate, then Convex + Clerk, then the webhook and user schema, then the app shell, then the chat API. I asked “what’s the next step?” a few times so I wouldn’t skip wiring. When something was visual, I pasted a screenshot instead of describing CSS. That was more reliable than another round of “the sidebar looks wrong.”

**What I did myself.** Account setup and secrets: Clerk, Convex, Vercel AI Gateway, `.env.local`. The product shape: `/` for a new chat, `/c/[convoId]` for a thread, sidebar history, sign-in in the header, composer always visible, Clerk signup on submit if you’re logged out. I also chose Anthropic through the AI Gateway rather than a raw provider key. Commits were mine, in small steps that match those prompts.

**What I delegated.** Schema, Clerk webhook, auth-gated Convex functions, the Next.js `/api/chat` route, and the chat UI. I also delegated bugfixing after a review, UI polish, the Vercel TypeScript failures, and the README clone/deploy instructions.

**Where it helped.** Fast scaffolding. Convex + Clerk is easy to get wrong (JWT template name, issuer domain, webhook path). The agent got the first wiring close enough to run. A dedicated review pass found real bugs I would have missed: a refresh on `/c/[id]` bouncing home because the Convex query ran before the Clerk token attached; the assistant reply flashing away between stream-end and the DB write; Enter sending a second message mid-stream; message history taking the oldest 200 instead of the newest.

**Where it got in the way.** I asked it to stash the unauthenticated draft and send it after signup. That produced composer/conversation glitches, so I cut the feature and went back to “submit opens signup.” The agent will keep patching a bad idea if you let it. Vendored AI Elements also didn’t type-check against AI SDK 7 / Streamdown on Vercel even though `next dev` was fine — a full `next build` locally would have caught that before deploy. UI polish needed screenshots; without them it guessed.

## Decisions and trade-offs

- **Convex over Prisma + Postgres.** A chat app is live data: sidebar list, message history, and “new convo” all need to update without a refresh. Convex gives that for free — queries are reactive, mutations are transactions, and Clerk identity is available inside those functions so ownership checks stay on the server. Prisma + Postgres would have meant a hosted DB, migrations, an API layer, and then websockets or polling to keep the UI in sync. That’s the right stack for a lot of products, but it was extra moving parts for this demo. The cost is vendor lock-in and a second deploy (`npx convex deploy` besides Vercel). I also still used a Next.js Route Handler for the model stream, so persistence and streaming are two systems with a short gap after the reply ends (we overlay `useChat` text until Convex catches up).
- **Vercel AI Gateway over a direct Anthropic key.** The app talks to Anthropic (`claude-sonnet-4.6`) through the AI SDK’s `model:` string and one `AI_GATEWAY_API_KEY`. I didn’t want an Anthropic secret in the Next.js env, and the Gateway keeps the option to change providers without rewriting the route. Direct Anthropic would have been a bit simpler (one vendor, their SDK/docs) and maybe slightly lower latency, but I’d be wiring provider auth, and swapping models later would be a code change instead of a gateway model id. For a Vercel-hosted app, the Gateway is the default I already had an account for.
- **Simple data model.** `users` (Clerk `externalId`), `conversations`, `messages`. No branching, tools, or attachments. Enough for a demo someone else can extend.
- **Auth UX.** Composer is always there; unauthenticated submit opens Clerk. I dropped “resume the draft after login” rather than ship a flaky path.
- **No keys in git.** `.env.local` is ignored; `.env.example` lists names only.

## What I’d do differently

- Run `next build` before the first Vercel deploy, and avoid installing the entire AI Elements set if we only need a few pieces.
- Don’t start the post-login draft feature unless the state machine is designed first (or skip it, which is what I ended up doing).
- Add a Convex production deploy key to the Vercel build so `git push` updates frontend and backend together.
- Tests around authz (wrong user, missing conversation) and the stream → persist overlay.
- If this grew, move `appendAssistant` off the public mutation surface and persist partial replies on stop.
