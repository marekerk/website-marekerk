# Marekerk website

De website van de Marekerk-gemeente in Leiden (Protestantse Gemeente Leiden). Statische site in [Astro](https://astro.build) met een paar Azure Functions (`api/`), gehost op Azure Static Web Apps. Alle infra staat als Bicep in `infra/`.

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
npm test --prefix api   # unit-tests van de functions
```

Site + functions samen (zoals in productie, op http://localhost:4280):

```sh
cp api/local.settings.example.json api/local.settings.json   # zet ICS_URL
npm install --prefix api
PUBLIC_AGENDA_PROXY_URL=/api/agenda npx @azure/static-web-apps-cli start http://localhost:4321 --run "npm run dev" --api-location api
```

Daarvoor zijn de [Azure Functions Core Tools](https://learn.microsoft.com/azure/azure-functions/functions-run-local) nodig (`brew install azure-functions-core-tools@4`).

## Omgevingsvariabelen

Build-tijd (site). Lokaal in `.env` (niet in git); in productie zet de workflow ze.

| Variabele | Waarvoor |
|---|---|
| `PUBLIC_AGENDA_PROXY_URL` | Waar de browser de agenda ophaalt. In productie `/api/agenda` (vast in de workflow). Heeft voorrang. |
| `PUBLIC_AGENDA_ICS_URL` | ICS-feed rechtstreeks; alleen bruikbaar als die zelf CORS-headers stuurt (of lokaal testen). |
| `PUBLIC_AGENDA_WEBCAL_URL` | Abonneerlink (`webcal://...`) onder de agendalijst en in de footer. Zonder waarde: `/kerkdiensten/#ics`. GitHub-variable. |
| `SITE_URL` | Eigen domein, bijv. `https://www.marekerk.nl`. GitHub-variable; zonder waarde het `*.azurestaticapps.net`-adres. |

Runtime (functions) staan als app-settings in `infra/main.bicep`; waarden komen uit GitHub:

| GitHub | Soort | Waarvoor |
|---|---|---|
| `ICS_URL` | secret | Feed van de kerkelijke agenda (`https://…` of `webcal://…`), opgehaald door `/api/agenda`. |
| `CUSTOM_DOMAIN` | variable | Optioneel, bijv. `www.marekerk.nl`. Eerst de CNAME naar het `azurestaticapps.net`-adres zetten. |
| `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` | secrets | Login van de workflow bij Azure; zie "Eerste keer". |

## Mapstructuur

```
.github/workflows/      deploy.yml: Bicep uitrollen, bouwen, uploaden
api/                    Azure Functions (managed door Static Web Apps)
  src/functions/        één bestand per endpoint, bijv. agenda.js -> GET /api/agenda
infra/                  Bicep: main.bicep (Static Web App), bootstrap.bicep (eenmalig)
content/                alle paginateksten (Markdown), zie content/README.md
design/                 ontwerpen (*.dc.html) + brief; bron voor de bouw
public/                 favicon, staticwebapp.config.json (404, headers, Node-versie API)
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
- Interne links en assets altijd via `href('/pad/')` uit `src/lib/url.ts`, zodat een eventuele `base` vanzelf meegaat.
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
  strip blijft de basis. Lokaal zonder `.env` is dat de normale situatie.
- Agenda-aanbieders sturen geen CORS-headers, dus in productie haalt de function `GET /api/agenda`
  (`api/src/functions/agenda.js`) de feed op, vanaf hetzelfde domein als de site. Hij cachet 5 minuten en
  geeft bij een storing van de bron de laatste versie terug. De feed-URL is het GitHub-secret `ICS_URL`;
  veranderen = secret aanpassen en de workflow opnieuw draaien.
- Lokaal testen: `PUBLIC_AGENDA_ICS_URL=http://localhost:<poort>/agenda.ics npm run dev`, met
  `src/scripts/__fixtures__/agenda.ics` geserveerd met header `Access-Control-Allow-Origin: *`.

## Deploy

`.github/workflows/deploy.yml` doet bij elke push naar `main` (of *Run workflow*):

1. tests (site en functions);
2. `infra/main.bicep` uitrollen in resourcegroep `rg-marekerk-website` (Static Web App, Free, met app-settings);
3. het deployment-token ophalen (staat nergens opgeslagen);
4. `npm run build` en `dist/` + `api/` uploaden.

### Eerste keer

Eenmalig, met een account dat Owner is op de Azure-subscription:

```sh
az login
az deployment sub create -l westeurope -f infra/bootstrap.bicep --query properties.outputs
```

Dat maakt de resourcegroep en een managed identity die alleen vanuit workflows op `main` van deze repo
mag inloggen (OIDC, geen wachtwoord) en Contributor is op alleen die resourcegroep. Zet de drie
`AZURE_*`-outputs plus de feed als secrets:

```sh
gh secret set AZURE_CLIENT_ID --body <AZURE_CLIENT_ID>
gh secret set AZURE_TENANT_ID --body <AZURE_TENANT_ID>
gh secret set AZURE_SUBSCRIPTION_ID --body <AZURE_SUBSCRIPTION_ID>
gh secret set ICS_URL            # plak de feed-URL
```

Daarna *Run workflow* (of push naar `main`). Het adres staat in de log van de stap "Deploy infra (Bicep)"
en in de Azure-portal.

### Een function toevoegen

Nieuw bestand in `api/src/functions/`, bijv. `inschrijven.js` met `app.http('inschrijven', …)`: dat wordt
`/api/inschrijven`. Logica die niet van Azure afhangt in `api/src/` zetten met een `*.test.js` ernaast.
Nieuwe instellingen als app-setting in `infra/main.bicep` (+ parameter in `main.bicepparam`). Opslag
(bijv. Table Storage voor inschrijvingen) komt als resource in `main.bicep`.

Managed functions kunnen alleen HTTP. Voor timers, queues of managed identity: eigen Function App
koppelen ("bring your own functions"), wat het Standard-plan vereist.
