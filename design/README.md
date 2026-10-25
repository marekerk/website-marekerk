# Ontwerp — bron voor de bouw

De `*.dc.html`-bestanden in deze map zijn de goedgekeurde ontwerpen (één bestand per pagina, plain HTML met inline styles). Ze zijn de **visuele waarheid**: bouw de Astro-pagina's zó dat ze er pixel-voor-pixel hetzelfde uitzien en gedragen. De tekst in de ontwerpen komt uit `docs/bron/261012 Teksten website (concept 0.3).docx`; verzin geen tekst, verander geen tekst, verander geen toon (geen je-vorm toevoegen waar die niet staat).

| Bestand | Route | Opmerking |
|---|---|---|
| `Main.dc.html` | `/` | Welkom |
| `Kerkdiensten.dc.html` | `/kerkdiensten/` | met `#live #agenda #kinderen #contact #alpha #alphacursus` |
| `Gemeente.dc.html` | `/onze-gemeente/` | `#missie #pgl #bakkerij #activiteiten #muziek #vieringen` |
| `Nieuw.dc.html` | `/ik-ben-nieuw/` | inschrijven = mailto |
| `Gebouw.dc.html` | `/gebouw/` | `#geschiedenis #orgel #kunst #bezoeken #huren` |
| `Geven.dc.html` | `/geven/` | `#contact #open`; footer-link "Alle contactgegevens" → `/geven/#contact` |
| `NietGevonden.dc.html` | `404.html` | |
| `Agenda-staten.dc.html` | — | staten van de agenda (laden / geladen / leeg / fout / nu live); geen pagina |
| `DL-Fundament.dc.html`, `DL-Elementen.dc.html` | — | design language: tokens en elementen |

## Hoe de ontwerpen te lezen

- `{{oct}}` = `polygon(29.3% 0, 70.7% 0, 100% 29.3%, 100% 70.7%, 70.7% 100%, 29.3% 100%, 0 70.7%, 0 29.3%)` (achthoek-clip-path).
- `{{navClass}}`, `{{navOpen}}`, `{{toggleNav}}` = mobiel menu (state `navOpen`, class `open` op `.nav-list`, `aria-expanded` op de knop).
- `/_blob/<id>` = afbeelding; mapping naar `src/assets/`:

| blob-id | bestand | alt in ontwerp |
|---|---|---|
| `367eedee16132f781e3001b399288177` | `logo.svg` | Marekerk gemeente (logo) |
| `e0969b486b712ee9e2cc7e90e46f5ecc` | `photos/gevel.jpg` | gevel aan de Lange Mare |
| `9cca867f6921b3650b76fdf24e6d9056` | `photos/koepelplafond.jpg` | koepelplafond met ribben |
| `a8111d7969a9bda3dfd9c4c6885a4944` | `photos/gracht.jpg` | kerk aan de gracht |
| `99bb0f884338b6f3df47ce145773ee0f` | `photos/kerkzaal.jpg` | kerkzaal |
| `1ca44ac5f528a559f69dbecbd7366c5f` | `photos/orgel.jpg` | Garrels-orgel |
| `2bcc4b1e1728d4d00cc105aca1061243` | `photos/preekstoel.jpg` | preekstoel 1649 |
| `affab63259990627df63854a2f2f102b` | `photos/koepel-buiten.jpg` | koepel van buiten |

Fotocredits staan in `src/assets/photos/credits.json` en moeten in de footer blijven zoals in het ontwerp. Grijze vlakken met "Foto · …" zijn placeholders voor foto's die de gemeente nog aanlevert: bouw ze als placeholder (navy 10-vlak met label), niet als `<img>`.

## Design language (kort)

- Kleuren: navy `#09283F`, navy 80 `#1F4566`, navy 10 `#E6EBF0`, lijn `#D9DEE3`, inkt `#1A2733`, inkt 2 `#4A5866`, goud `#C9A13B`, goud licht `#ECDFB3` (hover), tekst op navy `#DCE6EF`, footer-klein `#B9CDE0`. Grond wit.
- Goud alleen op navy (knop, label, onderstreping, marker) en op wit alleen als lijn/onderstreping — nooit als tekst of vlak op wit.
- Letter: Source Sans 3, 400/600/700, geen italic. Kapitalen alleen in labels (13px, 600, letter-spacing .12em).
- Achthoek alleen als marker: 10 (bullet), 24 (nummer/menu), 32 (sectienummer), 40 (icoon), 56 (datum). Foto's zijn gewone rechthoeken met bijschrift.
- Patroon: de kroonluchter (`src/assets/kroonluchter.svg`, inline in de ontwerpen; component `Kroonluchter.astro`), alleen op één navy vlak per pagina, goud 45 %. Welkom: variant *aangesneden* (groot, rechtsonder); overige pagina's: variant *hoek* (rechtsboven, of linksboven als de tekst rechts staat; op Gemeente en Geven 100px verder uit beeld omdat de rechterkolom tekst heeft). Op mobiel 60 % van de maat. De ribben zijn vervallen.
- Toon 65/35 wit/navy, nooit twee navy secties achter elkaar; laatste sectie voor de navy footer is wit.
- Diepte: één onderwerp → lijnen + lucht; meerdere → modules op 8px-grid (wit + 1px lijn, navy 10, navy). Schaduw alleen menu/dialoog.
- Knoppen 48px recht; focus-ring 3px goud, offset 3px. Skip-link "Direct naar de inhoud".
- Sticky "Op deze pagina"-nav (`.subnav`): op mobiel één rij horizontaal scrollbaar, actief item gouden inset-onderstreping (scroll-spy).

## Agenda (ICS, client-side)

De kerkelijke agenda verandert vaak, dus **niet tijdens de build** inladen. De pagina bevat altijd de statische basis ("Elke zondag 10.00 en 17.00"); JavaScript haalt de ICS-feed op en vult aan. Staten in `Agenda-staten.dc.html`. Feed-URL via `PUBLIC_AGENDA_ICS_URL`; omdat agenda-aanbieders geen CORS-headers sturen loopt het via een kleine proxy (Cloudflare Worker in `proxy/`, URL via `PUBLIC_AGENDA_PROXY_URL`). Abonneerlink (webcal) via `PUBLIC_AGENDA_WEBCAL_URL`.
