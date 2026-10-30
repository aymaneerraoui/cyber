# CYBER V9 — Installation

This ZIP includes complete replacement files. Keep your existing project backed up.

1. Extract into the root of the **Vercel Next.js** project, preserving folder structure. The files are for Vercel, NOT KataBump.
2. Commit and push to GitHub. Deploy to Vercel.
3. Vercel must have `DATABASE_URL`, `DISCORD_BOT_TOKEN`, `BOT_API_SECRET`. Do not expose them in browser/client variables.
4. In Discord, bot needs View Channel, Send Messages, Attach Files, Read Message History in the selected channel.
5. Open Ticket Analytics in Dashboard, choose a text channel and click Publish Leaderboard.
6. After a new *claimed* ticket is closed, the existing Discord message should be edited automatically. It will not ping staff (allowed_mentions is empty).

**Architecture:** Next.js server posts directly through Discord Bot REST API using `DISCORD_BOT_TOKEN`; no KataBump index.js changes are required. Image is generated dynamically using Next.js `ImageResponse` (PNG). Rankings are read from the existing Neon event table. On publish a new row is stored in `cyber_leaderboard_publishers`.

**Notes:** The PNG is a programmatically rendered Black & Gold design, not the earlier AI-generated concept artwork. Discord usernames are displayed as text inside the image, and actual clickable @mentions are in the accompanying message. Existing ticket event POST may take longer on ticket close because it waits for Discord image refresh. A Discord outage can leave an outdated leaderboard; manually click Update to retry. A channel change posts a new message in the new channel (the old message is not deleted). Concurrent updates across different Vercel instances may race. If the Next.js project has a strict TypeScript config, run `npm run build` before deploying and share errors for integration-specific fixes.
