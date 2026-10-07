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

## Portfolio management

After a current-day scan, select one or more table rows and choose **Save today's
picks**. Saving again on the same India-market date replaces that day's batch.
The Portfolio tab provides:

- **Today / 15 / 30 / 40 days**: daily cohorts with per-stock entry, current
  price, next-session return, and return if held through today.
- **Next-session return**: live LTP before that next trading session closes;
  after 15:35 IST, its daily close is saved as the final result. Weekends and
  exchange holidays naturally wait for the next available daily candle.
- **Held-through-today return**: assumes ₹10,000 was invested equally among each
  day's picks, then aggregates equal daily allocations through the current LTP.
- **All scanner stocks**: live change versus previous close for the entire
  configured scanner universe, refreshed every 60 seconds in the browser.

Server-only environment variables:

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE
PORTFOLIO_ENCRYPTION_KEY=<base64 encoded random 32-byte key>
PORTFOLIO_WEBHOOK_SECRET=<optional random secret, at least 32 characters>
ADMIN_PASSWORD_HASH=<generated scrypt hash; never the plaintext password>
APP_ORIGIN=https://your-service.onrender.com
```

Generate keys locally:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

`portfolio_batches.encrypted_payload` uses AES-256-GCM with a fresh nonce for
every write. Symbols, entry prices, saved closes, and return inputs are encrypted
before they reach PostgreSQL. The database can still see random row IDs, pick
dates, timestamps, row counts, and ciphertext sizes because dates are needed for
range queries. Losing or changing `PORTFOLIO_ENCRYPTION_KEY` makes existing
portfolio history unreadable, so back it up separately.

This is application-level encryption, not provider-blind end-to-end encryption.
When the app and encryption key both run on Render, Render infrastructure could
theoretically access process memory or environment variables. To make the host
unable to decrypt data, key handling and return calculations would need to move
to a trusted client or separate host.

For an after-close scheduler, call `POST /api/portfolio/webhook` with
`Authorization: Bearer <PORTFOLIO_WEBHOOK_SECRET>`. The operation is idempotent;
it fills unresolved next-session closes and leaves completed picks unchanged.

Render setup requires all five variables above. Never use a `NEXT_PUBLIC_`
prefix. Rotate the supplied database password before production deployment,
because it was shared outside Render.

## Public returns and admin access

`/` is the public returns page. It has two independent controls. The
recommendation-date control shows the current month by default or a custom last-N
calendar-day window. The return-horizon control measures every pick after 1, 2,
15, or 30 trading sessions. A daily heatmap uses green for gains, red for losses,
yellow for live or pending results, and shows the entry and horizon prices on
hover or keyboard focus.

The public JSON endpoint is `/api/returns?range=month&horizon=1`. For a custom
window use, for example, `/api/returns?range=days&days=16&horizon=2`. It exposes
only the date, symbol, display prices, selected-horizon return, and status. It
removes portfolio amounts, internal IDs, provider errors, tokens, and scanner
signals. Responses are coalesced and cached for 30 seconds to limit public
market-data traffic.

The public page also shows the active next-session recommendations with a Buy or
Short direction. The documented strategy enters at the next market session's
opening price and exits at a +1% directional return. New recommendations store
the confirmed opening price when that session begins; Buy returns rise with the
stock and Short returns rise when the stock falls. The page includes the
study-purpose, no-guarantee, independent-analysis, and non-SEBI-registered
disclosures.

`/admin` contains the scanner, selection controls, detailed portfolio view, and
all-scanner live market view. `/api/results`, `/api/scan`, `/api/market`, and
`/api/portfolio` require a valid administrator session. The password is stored
only as an OWASP-strength scrypt hash. Admin cookies are HttpOnly, SameSite=Strict,
and Secure in production. Sessions have a 30-minute idle timeout and eight-hour
absolute timeout; login is limited to five failed attempts per 15 minutes.
After selecting scanner rows, the administrator must assign Buy or Short to
every stock before the recommendation batch can be published.

The private login entry is `/valgo-ops-9f3k`; it is intentionally absent from
the public page. Unauthenticated `/admin`, the former `/admin/login`, and the
former `/api/admin/login` return 404. The hidden path only reduces automated
probing; password hashing, request-origin checks, throttling, and session
validation remain the security controls.

To change the local admin password without placing plaintext in source code:

```powershell
$adminPassword = Read-Host 'Admin password' -AsSecureString
$adminCredential = [System.Net.NetworkCredential]::new('', $adminPassword)
$adminCredential.Password | npx.cmd tsx scripts/set-admin-password.ts
Remove-Variable adminCredential, adminPassword
```

Restart the development server afterward. Copy the generated
`ADMIN_PASSWORD_HASH` from the ignored `.env.development.local` file to Render.
Set `APP_ORIGIN` to the exact public HTTPS origin; mutation requests from other
origins are rejected. Render's ephemeral filesystem can sign out all admins and
reset login-attempt history after a restart, while portfolio records remain in
PostgreSQL.

Database verification: `node --env-file=.env.local
--env-file=.env.development.local ./node_modules/tsx/dist/cli.mjs
scripts/check-portfolio-db.ts`. The check creates its test row inside a rolled-back
transaction and verifies that plaintext never reaches PostgreSQL.
