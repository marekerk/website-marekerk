/**
 * Agenda-runtime: haalt de ICS-feed in de browser op en vult de statische basis van
 * AgendaStrip ([data-agenda="strip"]) en AgendaList ([data-agenda="list"]) aan.
 * Geladen vanuit die componenten zelf; pagina's zonder agenda laden niets.
 * Dubbel laden is onschadelijk: elke container wordt maar één keer opgepakt.
 * Pure logica (parsen, uitrollen, formatteren) staat in agenda-core.ts.
 */
import { horizon, lijstRijen, parseAgenda, stripStaat, type AgendaItem } from './agenda-core.ts';

const FEED_URL: string = import.meta.env.PUBLIC_AGENDA_PROXY_URL || import.meta.env.PUBLIC_AGENDA_ICS_URL || '';
const STANDAARD_WEKEN = 8;
const TIMEOUT_MS = 10_000;

let feed: Promise<string> | null = null;
let gewaarschuwd = false;

/** Eén fetch per pagina, gedeeld door strip en lijst. `opnieuw` forceert een nieuwe. */
function haalFeed(opnieuw = false): Promise<string> {
  if (!feed || opnieuw) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    feed = fetch(FEED_URL, { cache: 'no-store', signal: ctrl.signal, headers: { Accept: 'text/calendar' } })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .finally(() => clearTimeout(timer));
    feed.catch(() => {
      feed = null;
    });
  }
  return feed;
}

async function laadItems(weken: number, opnieuw = false): Promise<AgendaItem[]> {
  const nu = new Date();
  return parseAgenda(await haalFeed(opnieuw), nu, horizon(nu, weken));
}

function waarschuw(fout: unknown): void {
  if (gewaarschuwd) return;
  gewaarschuwd = true;
  console.warn('Agenda kon niet worden geladen:', fout);
}

function getal(waarde: string | undefined, standaard?: number): number | undefined {
  const n = Number(waarde);
  return waarde && Number.isFinite(n) && n > 0 ? n : standaard;
}

/** Kloon van `<template data-template="naam">` binnen `root`. */
function kloon(root: Element, naam: string): DocumentFragment | null {
  const tpl = root.querySelector<HTMLTemplateElement>(`template[data-template="${naam}"]`);
  return tpl ? (tpl.content.cloneNode(true) as DocumentFragment) : null;
}

/** Vult [data-field]-elementen met tekst (nooit HTML: de feed is externe invoer). */
function vul(node: ParentNode, velden: Record<string, string>): void {
  for (const el of node.querySelectorAll<HTMLElement>('[data-field]')) {
    const v = velden[el.dataset.field ?? ''];
    if (v !== undefined) el.textContent = v;
  }
}

/* ---------- Lijst ---------- */

function startLijst(root: HTMLElement): void {
  const body = root.querySelector<HTMLElement>('[data-agenda-slot="body"]');
  if (!body) return;
  const skeleton = Array.from(body.childNodes, (n) => n.cloneNode(true));
  const limiet = getal(root.dataset.limit);
  const weken = getal(root.dataset.weeks, STANDAARD_WEKEN)!;

  const toon = (inhoud: Node | null) => {
    if (inhoud) body.replaceChildren(inhoud);
    body.removeAttribute('aria-busy');
  };

  const laad = async (opnieuw = false) => {
    try {
      const rijen = lijstRijen(await laadItems(weken, opnieuw), new Date(), limiet);
      if (!rijen.length) return toon(kloon(root, 'leeg'));
      const ul = document.createElement('ul');
      ul.className = 'agenda-list';
      for (const rij of rijen) {
        const li = kloon(root, 'rij');
        if (!li) continue;
        vul(li, { ...rij });
        // Geen omschrijving: geen lege tweede regel
        if (!rij.omschrijving) {
          const sub = li.querySelector('[data-field="omschrijving"]');
          if (sub?.previousElementSibling?.tagName === 'BR') sub.previousElementSibling.remove();
          sub?.remove();
        }
        ul.append(li);
      }
      toon(ul);
    } catch (fout) {
      waarschuw(fout);
      const melding = kloon(root, 'fout');
      const knop = melding?.querySelector<HTMLButtonElement>('[data-action="opnieuw"]');
      knop?.addEventListener('click', () => {
        body.replaceChildren(...skeleton.map((n) => n.cloneNode(true)));
        body.setAttribute('aria-busy', 'true');
        // Weer mislukt: focus op de nieuwe knop; gelukt: op de lijst (body, tabindex="-1")
        void laad(true).then(() => (body.querySelector<HTMLElement>('[data-action="opnieuw"]') ?? body).focus());
      });
      toon(melding);
    }
  };

  // Zonder feed-URL: geen skeleton en geen "niets in de agenda", alleen de vaste diensttijden
  if (!FEED_URL) return toon(kloon(root, 'basis'));
  void laad();
}

/* ---------- Strip ---------- */

function startStrip(root: HTMLElement): void {
  const slot = root.querySelector<HTMLElement>('[data-agenda-slot="content"]');
  if (!slot || !FEED_URL) return;

  laadItems(getal(root.dataset.weeks, STANDAARD_WEKEN)!)
    .then((items) => {
      const staat = stripStaat(items, new Date());
      if (!staat) return;
      if (staat.staat === 'live') {
        const live = kloon(root, 'live');
        if (!live) return;
        vul(live, { tijd: staat.tijd, omschrijving: staat.omschrijving });
        slot.replaceChildren(live);
        return;
      }
      const geladen = kloon(root, 'geladen');
      const lijst = geladen?.querySelector('[data-agenda-slot="diensten"]');
      if (!geladen || !lijst) return;
      vul(geladen, { dag: staat.dag, maand: staat.maand, datum: staat.datum });
      for (const d of staat.diensten) {
        const dienst = kloon(root, 'dienst');
        if (!dienst) continue;
        vul(dienst, d);
        lijst.append(dienst);
      }
      slot.replaceChildren(geladen);
    })
    // Geen foutmelding op Welkom: de basis blijft staan
    .catch(waarschuw);
}

/* ---------- Start ---------- */

function start(): void {
  for (const root of document.querySelectorAll<HTMLElement>('[data-agenda]:not([data-agenda-init])')) {
    root.setAttribute('data-agenda-init', '');
    try {
      if (root.dataset.agenda === 'list') startLijst(root);
      else if (root.dataset.agenda === 'strip') startStrip(root);
    } catch (fout) {
      waarschuw(fout);
    }
  }
}

start();
