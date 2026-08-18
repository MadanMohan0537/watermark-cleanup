# Deployment

## Cloudflare Workers

This app uses `@opennextjs/cloudflare`.

```bash
npm install
npx wrangler login
npm run deploy
```

`npm run deploy` builds with OpenNext and publishes the Worker. After the first deploy, bind a custom domain in the Cloudflare dashboard or attach `workers.dev`.

Preview the Worker runtime locally:

```bash
npm run preview
```

## Notes

- Enable `nodejs_compat` (already set in `wrangler.jsonc`).
- Browser-side cleanup is the default, so a free Worker plan can host the UI without storing uploads in R2.
- If you later persist jobs, add an R2 bucket, bind it, and replace `lib/storage/temp-store.ts`. Still delete objects automatically.
- Do not set `export const runtime = "edge"` on routes. OpenNext expects the Node-compatible Workers runtime.

## GitHub / CI

Suggested deploy command for Cloudflare Builds:

```bash
npm ci
npm test
npm run lint
npm run typecheck
npx opennextjs-cloudflare build
npx opennextjs-cloudflare deploy
```
