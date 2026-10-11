# Agenda-proxy (Cloudflare Worker)

Agenda-aanbieders sturen geen CORS-headers, dus de browser mag hun ICS-feed niet
rechtstreeks ophalen. Deze Worker haalt de feed op, zet er een
`Access-Control-Allow-Origin`-header op en cachet hem 5 minuten. Alleen `GET`
(en `OPTIONS`); pad en querystring worden genegeerd, dus het is geen open proxy.

## Instellingen (Worker-variabelen)

| Variabele | Waarde |
|---|---|
| `ICS_URL` | De feed van de kerkelijke agenda (`https://…` of `webcal://…`). Verplicht. |
| `ALLOWED_ORIGIN` | Origin van de site, bijv. `https://marekerk.nl` of `https://<owner>.github.io` (zonder pad). Zonder waarde: `*`. |

## Uitrollen met wrangler

Eenmalig een gratis Cloudflare-account. Dan, vanuit deze map:

```sh
npx wrangler login
npx wrangler deploy cloudflare-worker.js --name marekerk-agenda --compatibility-date 2026-10-01
npx wrangler secret put ICS_URL          # plak de feed-URL (als secret: komt niet in git)
npx wrangler secret put ALLOWED_ORIGIN   # bijv. https://marekerk.nl
```

Wrangler toont de URL van de Worker, bijv. `https://marekerk-agenda.<account>.workers.dev`.
Controleer met `curl -i <die URL>`: status 200, `Content-Type: text/calendar` en de
`Access-Control-Allow-Origin`-header.

Cachen: op een eigen (sub)domein via een route gebruikt de Worker de Cache API; op
`*.workers.dev` werkt die niet, daar cachet `cf.cacheTtl` op het ophalen van de feed.
Beide staan op 5 minuten.

De feed-URL veranderen kan later met `wrangler secret put ICS_URL` of in het
Cloudflare-dashboard (Workers → marekerk-agenda → Settings → Variables); de site
hoeft daarvoor niet opnieuw gebouwd te worden.

## URL in de site zetten

De site leest de Worker-URL uit `PUBLIC_AGENDA_PROXY_URL`. Die wordt tijdens de build
in de JavaScript gezet, dus:

1. GitHub → repository → Settings → Secrets and variables → Actions → tab **Variables** →
   **New repository variable**: `PUBLIC_AGENDA_PROXY_URL` = de Worker-URL.
   (Doe hetzelfde voor `PUBLIC_AGENDA_WEBCAL_URL` met de `webcal://`-link.)
2. Opnieuw deployen (push naar `main` of *Run workflow*).

Lokaal: zet dezelfde variabele in `.env`.
