This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Resumable scans

The browser starts a scan with `POST /api/scan` (`action: start`), then requests
one stock per chunk (`action: advance`, `id`, `cursor`). Progress reflects saved
stocks, not an estimated timer. Every chunk atomically saves its results and
cursor in `data/scan-job.json`; `/api/results` returns this snapshot with no-cache
headers. Legacy `data/screener-results.json` is used only before the first new scan.
The UI shows only results from the current run, including partial results.

Keep the tab open to advance chunks. After a refresh or connection failure,
click **Resume Scan**. Requests retry the same cursor safely. Provider failures
pause at the failed stock; insufficient history is counted as skipped. Requests
use an 8-second provider timeout and reuse authenticated sessions. Daily candles
are requested through the current exchange-local time, rather than midnight.

This file-backed service targets one Node instance. Render free storage is
[ephemeral](https://render.com/docs/free): restart, redeploy, or spin-down can
remove checkpoints and bring back the legacy bundled data. Durable retention
across these events requires an external database; multiple server instances
also require a shared transactional job store/lock. Chunks remove the single
multi-minute request, but do not make the free filesystem persistent.

Validation: `npx tsx --test src/__tests__/scan-job.test.ts`,
`npx tsx src/__tests__/kalman.test.ts`, `npx tsc --noEmit`, and `npm run build`.
