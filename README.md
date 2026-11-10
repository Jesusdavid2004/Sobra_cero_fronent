# Sobra_cero_fronent

Frontend of **SobraCero**, a food-rescue marketplace where shops publish lots close to expiry and neighbors reserve or donate them. Backend: [Sobra_cero](https://github.com/Jesusdavid2004/Sobra_cero) (FastAPI).

## Stack

Next.js 15 (App Router), React 19, TypeScript (strict), Tailwind CSS, next-intl (`/en`, `/es`), next-themes (system / light / dark), Zod, Vitest, Playwright.

## Setup

```bash
npm ci
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" > .env.local
npm run dev
```

Open `http://localhost:3000/en`. The backend must be running (see the backend repository for Docker Compose).

## Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Browser-visible API base URL, compiled at build time. Never put secrets here. | `http://localhost:8000/api/v1` |

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Development, production build, production server |
| `npm run lint` / `typecheck` / `format:check` | Static checks |
| `npm run i18n:check` | Verify `en` and `es` message keys match |
| `npm test` | Unit and component tests (Vitest) |
| `npm run e2e` | Playwright tests (`npx playwright install chromium` first) |

## Docker

```bash
docker build --build-arg NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1 -t sobracero-frontend .
docker run -p 3000:3000 sobracero-frontend
```

## Resumen en español

Interfaz web de SobraCero: mercado de lotes próximos a vencer, reservas con código de recogida, panel del comercio y panel de administración, en español e inglés con tema claro/oscuro. Requiere el backend del repositorio `Sobra_cero`.
