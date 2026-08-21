# Deployment

## Production deployment

The public app is hosted on Cloudflare Workers:

**https://watermark-cleanup.madanmohanlearning.workers.dev/**

Git-connected **Workers Builds** publishes `master` automatically. A successful production build uses:

| Setting | Value |
| --- | --- |
| Build command | `npx @opennextjs/cloudflare build` |
| Deploy command | `npx @opennextjs/cloudflare deploy` |
| Root directory | `/` |

Those commands are equivalent to `npm run build:cloudflare` followed by `npx @opennextjs/cloudflare deploy`.

OpenNext runs `npm run build` (`next build`) as a nested step. Keep that script as `next build`. Pointing it at `opennextjs-cloudflare build` causes an infinite loop and a Workers Builds timeout.

Do not set the Workers build command to `npm run build`. That only creates Next.js `.next` output. OpenNext also has to emit the `.open-next` Worker artifact that the deploy step publishes.

## Manual deploy

Use this path when you need to publish from a local machine:

```bash
npm install
npm run generate:assets
npx wrangler login
npm run deploy
```

`npm run deploy` builds with OpenNext and publishes the Worker named `watermark-cleanup` in `wrangler.jsonc`.

Preview the Worker runtime locally:

```bash
npm run preview
```

## Notes

- Enable `nodejs_compat` (already set in `wrangler.jsonc`).
- Browser-side cleanup is the default, so a free Worker plan can host the UI without storing uploads in R2.
- If you later persist jobs, add an R2 bucket, bind it, and replace `lib/storage/temp-store.ts`. Keep a strict automatic deletion policy.
- Do not set `export const runtime = "edge"` on routes. OpenNext expects the Node-compatible Workers runtime.

## GitHub / CI

GitHub Actions (`.github/workflows/ci.yml`) runs tests, lint, typecheck, and `npm run build` on every push and pull request. It does not deploy.

Production deploys come from Cloudflare Workers Builds after a green OpenNext build of `master`. If a previous build failed with `Could not find compiled Open Next config`, confirm the dashboard still uses the OpenNext build/deploy commands above rather than `npm run build` / `npx wrangler versions upload`.
