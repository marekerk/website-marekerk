# Teksten van de website

Alle paginateksten staan hier, in Markdown. De opmaak (kleuren, rasters, foto's) zit in `src/pages/`; die hoef je voor een tekstwijziging niet aan te raken.

## Indeling

Eén map per pagina, één bestand per sectie. Kaarten die naast elkaar staan hebben een eigen submap; het nummer vooraan de bestandsnaam bepaalt de volgorde.

```
welkom/          /               (homepage)
kerkdiensten/    /kerkdiensten/
onze-gemeente/   /onze-gemeente/  + activiteiten/, muziek/, vieringen/
ik-ben-nieuw/    /ik-ben-nieuw/
gebouw/          /gebouw/
geven/           /geven/          + contact/
404/             pagina niet gevonden
```

Een kaart toevoegen = een bestand toevoegen in zo'n submap (bijv. `onze-gemeente/activiteiten/5-nieuwe-club.md`).

## Een bestand

```markdown
---
label: Tijdens de morgendienst      # klein kapitaal boven de kop (optioneel)
title: Creche en kinderkerk         # kop
buttons:                            # knoppen/links onder de tekst (optioneel)
  - text: Meer informatie
    link: /ik-ben-nieuw/
---

Gewone alinea's, gescheiden door een lege regel.

- Opsommingen met een streepje
- [Links](mailto:naam@voorbeeld.nl) mogen in de tekst
```

Velden in het kopblok (tussen de `---`):

| Veld | Waarvoor |
|---|---|
| `title` | kop van de sectie of kaart |
| `label` | klein kapitaal boven de kop |
| `buttons` | knoppen of links: `text` + `link` |
| `items` | korte lijstjes (tijden, jaartallen, pijlers, tegels) met `label`, `title`, `text`, `link` |
| `intro` | losse inleiding (bijv. de linkerkolom bij De Bakkerij) |
| `caption` | bijschrift onder de foto |
| `highlight` | groot getal (het jaartal op Welkom) |
| `metaTitle`, `description` | titel in het browsertabblad en omschrijving voor zoekmachines (alleen in `hero.md`) |
| `wide` | `true`: kaart over de volle breedte |

## Afspraken

- **Links naar eigen pagina's alleen in `buttons` of `items`**, met een schuine streep ervoor: `/kerkdiensten/`. In de lopende tekst alleen `mailto:`, `tel:`, `#anker` of volledige adressen (`https://…`). Anders werkt de link niet op de testomgeving.
- Tekst tussen `[ ]` zonder link erachter is een plaatshouder en komt zo op de site; vervang hem zodra de tekst bekend is.
- Waarden met alleen cijfers of met een `:` erin tussen aanhalingstekens zetten: `title: "10.00"`.
- YouTube en Kerkomroep staan nog als `#youtube` / `#kerkomroep` in de tekst; vervang die ook in `src/lib/links.ts` (footer) als de echte adressen bekend zijn.
- Menu, footer en de teksten van de agenda zitten in de code (`src/components/`), net als de alt-teksten van foto's.

Bron van de teksten: `docs/bron/261012 Teksten website (concept 0.3).docx`.
