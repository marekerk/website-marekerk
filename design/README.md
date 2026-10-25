# Ontwerp — bron voor de bouw

De `*.dc.html`-bestanden in deze map zijn de goedgekeurde ontwerpen (**v4**, canvas "Marekerk pagina's v2") (één bestand per pagina, plain HTML met inline styles). Ze zijn de **visuele waarheid**: bouw de Astro-pagina's zó dat ze er pixel-voor-pixel hetzelfde uitzien en gedragen. De tekst in de ontwerpen komt uit `docs/bron/260924 Teksten website (concept 0.2).docx`; de actuele teksten (concept 0.3) staan in [`content/`](../content/README.md) en gaan voor op de tekst in de ontwerpen. Verzin geen tekst, verander geen tekst, verander geen toon (geen je-vorm toevoegen waar die niet staat).

| Bestand | Route | Opmerking |
|---|---|---|
| `Main.dc.html` | `/` | Welkom |
| `Kerkdiensten.dc.html` | `/kerkdiensten/` | met `#live #agenda #kinderen #contact #kennismaken #alpha #alphacursus` |
| `Gemeente.dc.html` | `/onze-gemeente/` | `#missie #pgl #bakkerij #activiteiten #muziek #vieringen` |
| `Nieuw.dc.html` | `/ik-ben-nieuw/` | inschrijven via formulier (link volgt) |
| `Gebouw.dc.html` | `/gebouw/` | `#geschiedenis #orgel #kunst #bezoeken #huren` |
| `Geven.dc.html` | `/geven/` | `#contact #open`; footer-link "Alle contactgegevens" → `/geven/#contact` |
| `NietGevonden.dc.html` | `404.html` | |
| `Agenda-staten.dc.html` | — | staten van de agenda (laden / geladen / leeg / fout / nu live); geen pagina |
| `DL-Fundament.dc.html`, `DL-Elementen.dc.html`, `DL-Patronen.dc.html` | — | design language v4: tokens, lockup, elementen, patronen |

## Hoe de ontwerpen te lezen

- `{{oct}}` = `polygon(29.3% 0, 70.7% 0, 100% 29.3%, 100% 70.7%, 70.7% 100%, 29.3% 100%, 0 70.7%, 0 29.3%)` (achthoek-clip-path).
- `{{navClass}}`, `{{navOpen}}`, `{{toggleNav}}` = mobiel menu (state `navOpen`, class `open` op `.nav-list`, `aria-expanded` op de knop).
- `/_blob/<id>` = afbeelding; mapping naar `src/assets/`:

| blob-id | bestand | alt in ontwerp |
|---|---|---|
| `b7beaf97222935b11b8cc996b49cce61` | `logo.svg` | het oude logo-plaatje; in v4 vervangen door de lockup (zie onder) |
| `5c44065e2948fd81fb76f483134efdc4` | `photos/gevel.jpg` | gevel aan de Lange Mare |
| `d4497b5978218940fa169158ded02954` | `photos/koepelplafond.jpg` | koepelplafond met ribben |
| `1f521f7b46ddc171b0777ae3d7dc6afa` | `photos/gracht.jpg` | kerk aan de gracht |
| `ceea656b5c0adc278defc725f71917ae` | `photos/kerkzaal.jpg` | kerkzaal |
| `d3e1c14c041ed17c7b99fd328b5f39ce` | `photos/orgel.jpg` | Garrels-orgel |
| `f812ce57ae95345cd81f632faacb1fed` | `photos/preekstoel.jpg` | preekstoel 1649 |
| `6794b56379d1940c8b593b66bd8a89ae` | `photos/koepel-buiten.jpg` | koepel van buiten |

Fotocredits staan in `src/assets/photos/credits.json` en moeten in de footer blijven zoals in het ontwerp. Grijze vlakken met "Foto · …" zijn placeholders voor foto's die de gemeente nog aanlevert: bouw ze als placeholder (navy 10-vlak met label), niet als `<img>`.

## Design language v4 (kort)

- Kleuren: **grond off-white `#F8F7F3`**; wit `#FFFFFF` voor de menubalk en witte modules; navy `#09283F`, navy 80 `#1F4566`, navy 10 `#E6EBF0`, lijn `#D9DEE3`, inkt `#1A2733`, inkt 2 `#4A5866`, goud `#C9A13B`, goud licht `#ECDFB3` (hover), tekst op navy `#DCE6EF`, footer-klein `#B9CDE0`.
- **Lockup uit het logo** (het ordenend principe): een Bold woord met een Light Italic (300) regel eronder.
  - Merk in header en footer: beeldmerk (`src/assets/beeldmerk.svg`, de koepel; 46 px hoog in de header, 44 in de footer) + "Marekerk" Bold 24 / "gemeente" Light Italic 17 **onder elkaar**, als levende tekst. Nooit het logo als plaatje.
  - Homepage-kop: "Welkom" Bold clamp(72px, 9vw, 112px) / 0.9 / −2 % met daaronder "bij de Marekerk gemeente" in Light Italic 0,32 × de kop. Subpagina's: label + H1 clamp(64px, 8vw, 96px) / 0.9 / −2 % + intro Regular, geen italic regel.
  - Een sectie opent met één zin in Light Italic 24 / 1.3 (bijv. "In de Marekerk hebben we elke zondag twee keer een dienst."), de tekst erna Regular. Het citaat op het navy geloof-vlak is Light Italic. Lopende tekst en intro's nooit italic.
- **Beeldmerk als silhouet**: alleen in de footer, navy 80 op navy, rechts, 360 px hoog, onderrand gelijk met de footer; de footer-inhoud eroverheen (`position: relative`).
- **Tijdenstrook** (eerstvolgende zondag, Welkom): navy strip met gouden achthoek-datum 56, "Zondag" Bold 22 + datum Light Italic eronder, verticale hairline navy 80, tijden Bold 40 met "Morgendienst · Ds. [naam]" Light Italic 17 eronder, rechts een witte omlijnde knop "Kijk of luister live mee". Data komen uit de ICS-agenda zoals nu.
- Font: Source Sans 3 met 400, 600, 700 **en 300 italic** (fontsource: ook `300-italic` importeren).
- Letterspatiëring koppen −0,02 em (was −0,03/−0,04).
- Afgewezen, niet bouwen: dubbele lijnen als motief, patronen op volle sterkte, merknaam op één regel, italic intro.
- Goud alleen op navy (knop, label, onderstreping, marker) en op wit alleen als lijn/onderstreping — nooit als tekst of vlak op wit.
- Letter: Source Sans 3, 400/600/700, geen italic. Kapitalen alleen in labels (13px, 600, letter-spacing .12em).
- Achthoek alleen als marker: 10 (bullet), 24 (nummer/menu), 32 (sectienummer), 40 (icoon), 56 (datum). Foto's zijn gewone rechthoeken met bijschrift.
- Ribben (8 lijnen uit één punt, SVG in de ontwerpen) alleen op één navy vlak per pagina, goud 45 % of wit 30 %.
- Toon 65/35 wit/navy, nooit twee navy secties achter elkaar; laatste sectie voor de navy footer is wit.
- Diepte: één onderwerp → lijnen + lucht; meerdere → modules op 8px-grid (wit + 1px lijn, navy 10, navy). Schaduw alleen menu/dialoog.
- Knoppen 48px recht; focus-ring 3px goud, offset 3px. Skip-link "Direct naar de inhoud".
- Sticky "Op deze pagina"-nav (`.subnav`): op mobiel één rij horizontaal scrollbaar, actief item gouden inset-onderstreping (scroll-spy).

## Agenda (ICS, client-side)

De kerkelijke agenda verandert vaak, dus **niet tijdens de build** inladen. De pagina bevat altijd de statische basis ("Elke zondag 10.00 en 17.00"); JavaScript haalt de ICS-feed op en vult aan. Staten in `Agenda-staten.dc.html`. Feed-URL via `PUBLIC_AGENDA_ICS_URL`; omdat agenda-aanbieders geen CORS-headers sturen loopt het via een kleine proxy (Cloudflare Worker in `proxy/`, URL via `PUBLIC_AGENDA_PROXY_URL`). Abonneerlink (webcal) via `PUBLIC_AGENDA_WEBCAL_URL`.
