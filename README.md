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
```

## Omgevingsvariabelen

Allemaal optioneel; zet ze in `.env` (niet in git) of als repository-variabele in GitHub.

| Variabele | Waarvoor |
|---|---|
| `PUBLIC_AGENDA_ICS_URL` | ICS-feed van de kerkelijke agenda. Wordt in de browser opgehaald, niet tijdens de build. |
| `PUBLIC_AGENDA_PROXY_URL` | CORS-proxy waarlangs de feed loopt (agenda-aanbieders sturen geen CORS-headers). |
| `PUBLIC_AGENDA_WEBCAL_URL` | Abonneerlink (`webcal://...`) onder de agendalijst en in de footer. Zonder waarde: `#`. |
| `SITE_URL` | Eigen domein. Zonder waarde bouwt de site voor `https://<owner>.github.io/<repo>/`. |

## Mapstructuur

```
design/                 ontwerpen (*.dc.html) + brief; bron voor de bouw
public/                 favicon
src/
  assets/               logo, app-icoon, foto's (+ photos/credits.json)
  components/           Header, Footer, Oct, OctDate, Ribben, Subnav, SectionHead,
                        Placeholder, AgendaStrip, AgendaList
  layouts/Base.astro    html-skelet, skip-link, header, main, footer
  lib/url.ts            href(): interne links met de base ervoor
  lib/links.ts          externe links en contactgegevens die vaker terugkomen
  pages/                één bestand per route (index, 404, ...)
  styles/global.css     tokens en gedeelde stijlen
```

## Afspraken

- Interne links en assets altijd via `href('/pad/')` uit `src/lib/url.ts`; anders breekt de site onder `/website-marekerk/` op GitHub Pages.
- Foto's via `astro:assets` (`<Image>`), met de alt-tekst uit het ontwerp. Geef per pagina in `<Base photos={[...]}>` op welke foto's erop staan; de footer maakt daar de credits-regel van.
- Grijze "Foto · …"-vlakken zijn plaatshouders (`<Placeholder>`), geen `<img>`.
- De agenda wordt in de browser geladen. De pagina bevat altijd een statische basis; zie `AgendaStrip.astro` en `AgendaList.astro` voor de templates en data-attributen.

## Deploy

`.github/workflows/deploy.yml` bouwt en publiceert bij elke push naar `main`.
