/**
 * Agenda runtime: fetches the ICS feed in the browser and fills in the static base of
 * AgendaStrip ([data-agenda="strip"]) and AgendaList ([data-agenda="list"]).
 * Loaded from those components themselves; pages without an agenda load nothing.
 * Loading twice is harmless: each container is only picked up once.
 * Pure logic (parsing, expanding, formatting) lives in agenda-core.ts.
 */
import { horizon, listRows, parseAgenda, stripState, type AgendaItem } from './agenda-core.ts';

const FEED_URL: string = import.meta.env.PUBLIC_AGENDA_PROXY_URL || import.meta.env.PUBLIC_AGENDA_ICS_URL || '';
const DEFAULT_WEEKS = 8;
const TIMEOUT_MS = 10_000;

let feed: Promise<string> | null = null;
let warned = false;

/** One fetch per page, shared by strip and list. `retry` forces a new one. */
function fetchFeed(retry = false): Promise<string> {
  if (!feed || retry) {
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

async function loadItems(weeks: number, retry = false): Promise<AgendaItem[]> {
  const now = new Date();
  return parseAgenda(await fetchFeed(retry), now, horizon(now, weeks));
}

function warn(error: unknown): void {
  if (warned) return;
  warned = true;
  console.warn('Could not load agenda:', error);
}

function positiveNumber(value: string | undefined, fallback?: number): number | undefined {
  const n = Number(value);
  return value && Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Clone of `<template data-template="name">` within `root`. */
function cloneTemplate(root: Element, name: string): DocumentFragment | null {
  const tpl = root.querySelector<HTMLTemplateElement>(`template[data-template="${name}"]`);
  return tpl ? (tpl.content.cloneNode(true) as DocumentFragment) : null;
}

/** Fills [data-field] elements with text (never HTML: the feed is external input). */
function fill(node: ParentNode, fields: Record<string, string>): void {
  for (const el of node.querySelectorAll<HTMLElement>('[data-field]')) {
    const v = fields[el.dataset.field ?? ''];
    if (v !== undefined) el.textContent = v;
  }
}

/* ---------- List ---------- */

function startList(root: HTMLElement): void {
  const body = root.querySelector<HTMLElement>('[data-agenda-slot="body"]');
  if (!body) return;
  const skeleton = Array.from(body.childNodes, (n) => n.cloneNode(true));
  const limit = positiveNumber(root.dataset.limit);
  const weeks = positiveNumber(root.dataset.weeks, DEFAULT_WEEKS)!;

  const show = (content: Node | null) => {
    if (content) body.replaceChildren(content);
    body.removeAttribute('aria-busy');
  };

  const load = async (retry = false) => {
    try {
      const rows = listRows(await loadItems(weeks, retry), new Date(), limit);
      if (!rows.length) return show(cloneTemplate(root, 'empty'));
      const ul = document.createElement('ul');
      ul.className = 'agenda-list';
      for (const row of rows) {
        const li = cloneTemplate(root, 'row');
        if (!li) continue;
        fill(li, { ...row });
        // No subtitle: no empty second line
        if (!row.subtitle) {
          const sub = li.querySelector('[data-field="subtitle"]');
          if (sub?.previousElementSibling?.tagName === 'BR') sub.previousElementSibling.remove();
          sub?.remove();
        }
        ul.append(li);
      }
      show(ul);
    } catch (error) {
      warn(error);
      const message = cloneTemplate(root, 'error');
      const button = message?.querySelector<HTMLButtonElement>('[data-action="retry"]');
      button?.addEventListener('click', () => {
        body.replaceChildren(...skeleton.map((n) => n.cloneNode(true)));
        body.setAttribute('aria-busy', 'true');
        // Failed again: focus the new button; succeeded: focus the list (body, tabindex="-1")
        void load(true).then(() => (body.querySelector<HTMLElement>('[data-action="retry"]') ?? body).focus());
      });
      show(message);
    }
  };

  // Without a feed URL: no skeleton and no "nothing in the agenda", only the fixed service times
  if (!FEED_URL) return show(cloneTemplate(root, 'default'));
  void load();
}

/* ---------- Strip ---------- */

function startStrip(root: HTMLElement): void {
  const slot = root.querySelector<HTMLElement>('[data-agenda-slot="content"]');
  if (!slot || !FEED_URL) return;

  loadItems(positiveNumber(root.dataset.weeks, DEFAULT_WEEKS)!)
    .then((items) => {
      const state = stripState(items, new Date());
      if (!state) return;
      if (state.state === 'live') {
        const live = cloneTemplate(root, 'live');
        if (!live) return;
        fill(live, { time: state.time, description: state.description });
        slot.replaceChildren(live);
        return;
      }
      const loaded = cloneTemplate(root, 'loaded');
      const list = loaded?.querySelector('[data-agenda-slot="services"]');
      if (!loaded || !list) return;
      fill(loaded, { day: state.day, month: state.month, date: state.date });
      for (const s of state.services) {
        const service = cloneTemplate(root, 'service');
        if (!service) continue;
        fill(service, s);
        list.append(service);
      }
      slot.replaceChildren(loaded);
    })
    // No error message on the home page: the static base stays
    .catch(warn);
}

/* ---------- Start ---------- */

function start(): void {
  for (const root of document.querySelectorAll<HTMLElement>('[data-agenda]:not([data-agenda-init])')) {
    root.setAttribute('data-agenda-init', '');
    try {
      if (root.dataset.agenda === 'list') startList(root);
      else if (root.dataset.agenda === 'strip') startStrip(root);
    } catch (error) {
      warn(error);
    }
  }
}

start();
