# Rendering strategy

Each route uses the pattern that fits its freshness, privacy and interactivity needs.
The choice is not "SSR is faster": stable text is built once, public inventory is read on
every request, and private dashboards stay in the browser.

| Pattern       | Route                    | Why                                                                                                                     | How to verify                                                                                                                                                                                    |
| ------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SSG           | `/{locale}/how-it-works` | Stable explanation, identical for everyone. `dynamic = "force-static"`.                                                 | `next build` lists it as prerendered for `en` and `es`; response has `x-nextjs-prerender: 1` and `Cache-Control: s-maxage=31536000`.                                                             |
| SSR           | `/{locale}/lots/{id}`    | Public lot (stock, price, expiry) is read on every request. `dynamic = "force-dynamic"`.                                | `curl` the page: the lot title, quantity and price are in the HTML before any JavaScript; `<title>` carries the lot title; unknown id returns 404. `Cache-Control: private, no-cache, no-store`. |
| Streaming SSR | `/{locale}/market`       | Hero and filters are sent first; the lot list and the promotion highlights are separate `Suspense` boundaries.          | The HTML starts with skeletons and contains `id="B:0"` and `id="B:1"` boundaries completed by `$RC` scripts; response is `Transfer-Encoding: chunked`. A spinner alone is not the evidence.      |
| CSR           | `/{locale}/shop`         | Private data (sales, risk, rescue plans). The access token lives in browser memory, so Server Components cannot use it. | Data is fetched from the browser through `lib/api.ts`; the initial HTML has no shop data.                                                                                                        |
| CSR           | `/{locale}/lots`         | Interactive filters on public lots.                                                                                     | Same as above, with client-side filtering.                                                                                                                                                       |
| ISR           | not implemented          | Needs a public shop-profile endpoint that does not exist yet. ISR must not be used for stock.                           | Pending.                                                                                                                                                                                         |

## Rules

- The lot page is rendered on the server, but **a reservation is always validated again by the
  API transaction**: the page never decides availability.
- Public server reads go through `lib/server-api.ts` (Zod-validated, `cache: "no-store"`).
  Private reads stay in `lib/api.ts` on the client.
- If the API is unreachable, the lot page still renders and falls back to client-side loading,
  and the market page shows a translated error instead of failing.
- No shared public cache is used for sales data, pickup codes or account information.
- `API_INTERNAL_URL` (optional) lets the Next.js server reach the API on a private network;
  it falls back to `NEXT_PUBLIC_API_URL`.

## Verify locally

```bash
npm run build
API_INTERNAL_URL=http://127.0.0.1:8000/api/v1 node .next/standalone/server.js   # or: npx next start
curl -sD - -o /dev/null http://localhost:3000/en/how-it-works
curl -sD - -o /dev/null http://localhost:3000/en/market
curl -s http://localhost:3000/en/lots/1 | grep -o "<title>[^<]*"
```

Use `127.0.0.1` rather than `localhost` for the API when it listens only on IPv4: Node
resolves `localhost` to `::1` first.

Measured on 2026-11-10 with Next.js 15.5 in production mode, against a demo SQLite database.
These checks show which pattern each route uses; they are not performance measurements.
