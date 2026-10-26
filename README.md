# Marekerk website

De website van de Marekerk-gemeente in Leiden (Protestantse Gemeente Leiden). Statische site in [Astro](https://astro.build), gehost op GitHub Pages.

De goedgekeurde ontwerpen staan in [`design/`](design/README.md). Die zijn de visuele waarheid: pagina's zien er pixel-voor-pixel hetzelfde uit en de teksten komen daar letterlijk uit.

## Aan de slag

Vereist Node 22.12 of nieuwer (zie `.nvmrc`).

```sh
npm install
npm run dev      # ontwikkelserver op http://localhost:4321
npm run build    # statische site naar dist/
npm run preview  # dist/ lokaal bekijken
npm run check    # astro check (types en templates)
npm test         # unit-tests agenda-logica (node:test)
```

## Omgevingsvariabelen

Allemaal optioneel; zet ze in `.env` (niet in git) of als repository-variabele in GitHub.

| Variabele | Waarvoor |
|---|---|
| `PUBLIC_AGENDA_PROXY_URL` | URL van de agenda-proxy (Cloudflare Worker, zie [`proxy/`](proxy/README.md)). Heeft voorrang. |
| `PUBLIC_AGENDA_ICS_URL` | ICS-feed rechtstreeks; alleen bruikbaar als die zelf CORS-headers stuurt (of lokaal testen). |
| `PUBLIC_AGENDA_WEBCAL_URL` | Abonneerlink (`webcal://...`) onder de agendalijst en in de footer. Zonder waarde: `/kerkdiensten/#ics`. |
| `SITE_URL` | Eigen domein. Zonder waarde bouwt de site voor `https://<owner>.github.io/<repo>/`. |

## Mapstructuur

```
content/                alle paginateksten (Markdown), zie content/README.md
design/                 ontwerpen (*.dc.html) + brief; bron voor de bouw
proxy/                  Cloudflare Worker die de agenda-feed met CORS doorgeeft
public/                 favicon
src/
  assets/               beeldmerk, patronen (kroonluchter, plafond, ramen), logo, app-icoon,
                        foto's (+ photos/credits.json)
  components/           Header, Footer, Lockup, Patroon, Oct, OctDate, Subnav, SectionHead,
                        Placeholder, Prose, AgendaStrip, AgendaList
  content.config.ts     content-collectie `blocks` (leest content/)
  lib/content.ts        block(), blocksIn() en bodyParts(): teksten ophalen per pagina
  layouts/Base.astro    html-skelet, skip-link, header, main, footer
  lib/url.ts            href(): interne links met de base ervoor
  lib/links.ts          externe links en contactgegevens die vaker terugkomen
  scripts/agenda.ts     agenda-runtime (DOM); scripts/agenda-core.ts = pure logica + test
  pages/                één bestand per route (index, 404, ...)
  styles/global.css     tokens en gedeelde stijlen
```

## Afspraken

- Teksten staan in [`content/`](content/README.md), niet in de pagina's. Een pagina haalt ze op met `block('<pagina>/<bestand>')` en toont de lopende tekst met `<Prose block={...} />`.

- Interne links en assets altijd via `href('/pad/')` uit `src/lib/url.ts`; anders breekt de site onder `/website-marekerk/` op GitHub Pages.
- Foto's via `astro:assets` (`<Image>`), met de alt-tekst uit het ontwerp. Geef per pagina in `<Base photos={[...]}>` op welke foto's erop staan; de footer maakt daar de credits-regel van.
- Grijze "Foto · …"-vlakken zijn plaatshouders (`<Placeholder>`), geen `<img>`.
- De agenda wordt in de browser geladen. De pagina bevat altijd een statische basis; zie `AgendaStrip.astro` en `AgendaList.astro` voor de templates en data-attributen.

## Agenda

De kerkelijke agenda (ICS) verandert vaak en wordt daarom **in de browser** opgehaald, niet bij de build.

- `AgendaStrip` (Welkom) en `AgendaList` (Welkom, Kerkdiensten) renderen een statische basis
  ("Elke zondag 10.00 en 17.00") en laden zelf `src/scripts/agenda.ts`; pagina's zonder agenda laden niets.
- Het script haalt de feed één keer per pagina op (`PUBLIC_AGENDA_PROXY_URL`, anders `PUBLIC_AGENDA_ICS_URL`),
  parset hem met `ical.js`, rolt terugkerende afspraken (RRULE, EXDATE, gewijzigde exemplaren) uit tot
  `data-weeks` weken vooruit (standaard 8) en rekent in Europe/Amsterdam.
- **Lijst:** komende items, max `data-limit`; titel = samenvatting, regel eronder = locatie of eerste regel
  van de omschrijving, rechts de begintijd of "hele dag". Leeg → leegstaat, fout → foutstaat met "Probeer opnieuw".
- **Strip:** de (resterende) diensten van de eerstvolgende zondag (samenvatting bevat "dienst"), met de
  voorganger = samenvatting zonder "morgendienst"/"middagdienst". Van 15 minuten voor begin tot het eind
  van een dienst: "Nu live". Bij een fout blijft de basis stil staan.
- Geen feed-URL ingesteld: lijst toont alleen de vaste diensttijden (geen skeleton, geen leegstaat),
  strip blijft de basis. **De lijst vult pas als de repository variable `PUBLIC_AGENDA_PROXY_URL`
  (of `PUBLIC_AGENDA_ICS_URL`) gezet is**; `deploy.yml` geeft die (en `PUBLIC_AGENDA_WEBCAL_URL`) al door
  aan de build. Zonder webcal-URL verwijzen de abonneerlinks naar `/kerkdiensten/#ics`.
- Agenda-aanbieders sturen geen CORS-headers, dus in productie loopt de feed via een Cloudflare Worker
  in [`proxy/`](proxy/README.md). Daar staat ook hoe de feed-URL wordt ingesteld.
- Lokaal testen: `PUBLIC_AGENDA_ICS_URL=http://localhost:<poort>/agenda.ics npm run dev`, met
  `src/scripts/__fixtures__/agenda.ics` geserveerd met header `Access-Control-Allow-Origin: *`.

## Deploy

`.github/workflows/deploy.yml` bouwt en publiceert bij elke push naar `main`.
