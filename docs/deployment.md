# Deployment

## Production deployment

The public deployment is hosted on Cloudflare Workers:

**https://watermark-cleanup.madanmohanlearning.workers.dev/**

## Cloudflare Workers

This app uses `@opennextjs/cloudflare`.

```bash
npm install
npm run generate:assets
npx wrangler login
npm run deploy
```

`npm run deploy` builds with OpenNext and publishes the Worker. After the first deploy, bind a custom domain in the Cloudflare dashboard or attach a `workers.dev` domain.

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

For a repository connected to **Workers Builds**, set the dashboard fields to these exact values:

| Setting | Value |
| --- | --- |
| Build command | `npm run build:cloudflare` |
| Deploy command | `npx opennextjs-cloudflare deploy` |
| Root directory | `/` |

Do not use `npm run build` as the Workers build command. That command only creates Next.js' `.next` output. The Cloudflare build command above also converts it into the `.open-next` Worker artifact required by the deploy step.

The equivalent CI sequence is:

```bash
npm ci
npm test
npm run lint
npm run typecheck
npm run build:cloudflare
npx opennextjs-cloudflare deploy
```

If a previous build failed with `Could not find compiled Open Next config`, update the two dashboard command fields and retry the deployment. The normal Next.js warning about a missing build cache affects build speed only and is not a deployment failure.
