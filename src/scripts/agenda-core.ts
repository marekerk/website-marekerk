/**
 * Pure agenda-logica (geen DOM): ICS parsen, herhalingen uitrollen, en de gegevens
 * voor de agendalijst en de tijdenstrip afleiden. Alle tijden in Europe/Amsterdam.
 * Getest met node:test (npm test); de DOM-kant staat in agenda.ts.
 */
import ICAL from 'ical.js';

type IcalTime = InstanceType<typeof ICAL.Time>;
type IcalEvent = InstanceType<typeof ICAL.Event>;
type IcalComponent = InstanceType<typeof ICAL.Component>;

export const TIJDZONE = 'Europe/Amsterdam';

export interface AgendaItem {
  start: Date;
  end: Date;
  /** ICS SUMMARY */
  titel: string;
  /** ICS LOCATION */
  locatie: string;
  /** ICS DESCRIPTION */
  omschrijving: string;
  heleDag: boolean;
}

export interface LijstRij {
  dag: string;
  maand: string;
  titel: string;
  omschrijving: string;
  tijd: string;
}

export type StripStaat =
  | { staat: 'live'; tijd: string; omschrijving: string }
  | {
      staat: 'geladen';
      /** Achthoek-datum: "11" en "okt". */
      dag: string;
      maand: string;
      /** Lockup-regel onder "Zondag": "11 oktober". */
      datum: string;
      /** "10.00" met "Morgendienst · Ds. J. de Vries". */
      diensten: { tijd: string; omschrijving: string }[];
    };

const MINUUT = 60_000;
const DAG = 24 * 60 * MINUUT;
/** Veiligheidsgrens per terugkerende afspraak (exemplaren vanaf het begin van het venster). */
const MAX_HERHALINGEN = 5000;
/** Harde bovengrens op iteraties, ook vóór het venster (tegen pathologische regels zoals FREQ=MINUTELY). */
const MAX_ITERATIES = 100000;

// Feeds die naar Europe/Amsterdam verwijzen zonder VTIMEZONE mee te sturen, toch goed lezen.
const AMSTERDAM_VTIMEZONE = [
  'BEGIN:VCALENDAR',
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Amsterdam',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
  'END:VCALENDAR',
].join('\r\n');

let tzGeregistreerd = false;
function registreerAmsterdam(): void {
  if (tzGeregistreerd || ICAL.TimezoneService.has(TIJDZONE)) return;
  const vtz = new ICAL.Component(ICAL.parse(AMSTERDAM_VTIMEZONE)).getFirstSubcomponent('vtimezone');
  if (vtz) ICAL.TimezoneService.register(vtz);
  tzGeregistreerd = true;
}

/** UTC-offset (ms) van `tz` op tijdstip `ms`. */
function offset(ms: number, tz = TIJDZONE): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    })
      .formatToParts(new Date(ms))
      .map((x) => [x.type, Number(x.value)]),
  );
  const alsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return alsUtc - Math.floor(ms / 1000) * 1000;
}

/** Wandkloktijd in Amsterdam → Date. */
export function amsterdamTijd(j: number, m: number, d: number, u = 0, min = 0, s = 0): Date {
  const gok = Date.UTC(j, m - 1, d, u, min, s);
  const o1 = offset(gok - offset(gok));
  return new Date(gok - o1);
}

function naarDate(t: IcalTime): Date {
  // Hele dag en zwevende tijden (of een onbekende TZID) gelden als Amsterdamse wandkloktijd.
  if (t.isDate || t.zone === ICAL.Timezone.localTimezone) {
    return amsterdamTijd(t.year, t.month, t.day, t.hour, t.minute, t.second);
  }
  return t.toJSDate();
}

function tekst(e: IcalEvent, veld: 'location' | 'description'): string {
  const v = e[veld];
  return typeof v === 'string' ? v.trim() : '';
}

function maakItem(e: IcalEvent, start: IcalTime, eind: IcalTime): AgendaItem {
  const s = naarDate(start);
  let en = naarDate(eind);
  // Zonder (geldig) eind: hele dag = één dag, anders 90 minuten (lengte van een dienst)
  if (en.getTime() <= s.getTime()) en = new Date(s.getTime() + (start.isDate ? DAG : 90 * MINUUT));
  return {
    start: s,
    end: en,
    titel: (e.summary ?? '').trim(),
    locatie: tekst(e, 'location'),
    omschrijving: tekst(e, 'description'),
    heleDag: start.isDate,
  };
}

function geannuleerd(c: IcalComponent): boolean {
  return String(c.getFirstPropertyValue('status') ?? '').toUpperCase() === 'CANCELLED';
}

/**
 * Parse een ICS-tekst en geef alle (uitgerolde) afspraken die overlappen met [van, tot),
 * gesorteerd op begin. Gooit bij ongeldige ICS.
 */
export function parseAgenda(ics: string, van: Date, tot: Date): AgendaItem[] {
  registreerAmsterdam();
  const kal = new ICAL.Component(ICAL.parse(ics));
  const vevents = kal.getAllSubcomponents('vevent');

  // Uitzonderingen (RECURRENCE-ID) koppelen aan hun reeks
  const reeksen = new Map<string, IcalEvent>();
  const losse: IcalEvent[] = [];
  const uitzonderingen: IcalEvent[] = [];
  for (const c of vevents) {
    // Lege exceptions: anders koppelt ical.js álle RECURRENCE-ID's in de feed, ongeacht UID
    const e = new ICAL.Event(c, { exceptions: [], strictExceptions: true });
    if (e.isRecurrenceException()) uitzonderingen.push(e);
    else {
      if (geannuleerd(c)) continue;
      if (e.isRecurring()) reeksen.set(e.uid, e);
      else losse.push(e);
    }
  }
  for (const u of uitzonderingen) {
    const reeks = reeksen.get(u.uid);
    if (reeks) reeks.relateException(u);
    else if (!geannuleerd(u.component)) losse.push(u);
  }

  const vanMs = van.getTime();
  const totMs = tot.getTime();
  const items: AgendaItem[] = [];
  const binnen = (i: AgendaItem) => i.end.getTime() > vanMs && i.start.getTime() < totMs;

  for (const e of losse) {
    if (!e.startDate) continue;
    const i = maakItem(e, e.startDate, e.endDate ?? e.startDate);
    if (binnen(i)) items.push(i);
  }

  for (const e of reeksen.values()) {
    const verwerkt = new Set<IcalEvent>();
    // Niet iterator(van): dat verankert de regel opnieuw op `van` (COUNT/INTERVAL kloppen dan niet)
    const it = e.iterator();
    let n = 0;
    let iteraties = 0;
    for (let volgende = it.next(); volgende && n < MAX_HERHALINGEN && iteraties++ < MAX_ITERATIES; volgende = it.next()) {
      // Afbreken op de oorspronkelijke datum; een verplaatst exemplaar telt op zijn eigen datum
      const ms = naarDate(volgende).getTime();
      if (ms >= totMs) break;
      // Alleen exemplaren vanaf `van` tellen voor de grens, anders vallen oude reeksen weg
      if (ms >= vanMs) n++;
      const d = e.getOccurrenceDetails(volgende);
      if (d.item !== e) verwerkt.add(d.item);
      if (geannuleerd(d.item.component)) continue;
      const i = maakItem(d.item, d.startDate, d.endDate);
      if (binnen(i)) items.push(i);
    }
    // Exemplaren die van voorbij de horizon naar binnen de horizon zijn verplaatst
    for (const u of Object.values(e.exceptions) as IcalEvent[]) {
      if (verwerkt.has(u) || geannuleerd(u.component) || !u.startDate) continue;
      const i = maakItem(u, u.startDate, u.endDate ?? u.startDate);
      if (binnen(i)) items.push(i);
    }
  }

  return items.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/* ---------- Formatteren (nl-NL, Amsterdam) ---------- */

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('nl-NL', { timeZone: TIJDZONE, ...o });
const fDag = fmt({ day: 'numeric' });
const fMaand = fmt({ month: 'short' });
const fTijd = fmt({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const fWeekdag = fmt({ weekday: 'long' });
const fDagMaand = fmt({ day: 'numeric', month: 'long' });
const fDagSleutel = fmt({ year: 'numeric', month: '2-digit', day: '2-digit' });

const hoofdletter = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "10.00" */
export const tijd = (d: Date) => fTijd.format(d).replace(':', '.');
/** "12 oktober" */
export const dagMaand = (d: Date) => fDagMaand.format(d);
/** "okt" (zonder punt) */
const maandKort = (d: Date) => fMaand.format(d).replace(/\.$/, '');
const isZondag = (d: Date) => fWeekdag.format(d) === 'zondag';
const dagSleutel = (d: Date) => fDagSleutel.format(d);

/** Locatie, anders de eerste niet-lege regel van de omschrijving. */
function onderregel(i: AgendaItem): string {
  if (i.locatie) return i.locatie;
  return i.omschrijving.split(/\r?\n/).map((r) => r.trim()).find(Boolean) ?? '';
}

/* ---------- Lijst ---------- */

/** Komende items (begin vanaf nu; hele-dag-items van vandaag tellen mee), max `limiet`. */
export function lijstRijen(items: AgendaItem[], nu: Date, limiet?: number): LijstRij[] {
  const komend = items.filter((i) => (i.heleDag ? i.end > nu : i.start >= nu));
  return komend.slice(0, limiet && limiet > 0 ? limiet : undefined).map((i) => ({
    dag: fDag.format(i.start),
    maand: maandKort(i.start),
    titel: i.titel,
    omschrijving: onderregel(i),
    tijd: i.heleDag ? 'hele dag' : tijd(i.start),
  }));
}

/* ---------- Strip ---------- */

const DIENSTSOORT = /\b(morgen|middag)dienst\b/i;
const RAND = /^[\s\-–—·•:|,/]+|[\s\-–—·•:|,/]+$/g;

/** "Morgendienst - Ds. J. de Vries" → "Ds. J. de Vries"; blijft er niets over, dan de samenvatting. */
export function voorganger(samenvatting: string): string {
  const rest = samenvatting.replace(new RegExp(DIENSTSOORT.source, 'gi'), ' ').replace(RAND, '').replace(/\s{2,}/g, ' ');
  return rest || samenvatting.trim();
}

/** "Morgendienst - Ds. J. de Vries" → "Morgendienst · Ds. J. de Vries"; zonder dienstsoort de samenvatting. */
export function dienstOmschrijving(samenvatting: string): string {
  const soort = samenvatting.match(DIENSTSOORT);
  const vg = voorganger(samenvatting);
  return soort && vg !== samenvatting.trim() ? `${hoofdletter(soort[0].toLowerCase())} · ${vg}` : samenvatting.trim();
}

/**
 * Staat van de tijdenstrip: "live" als nu een dienst bezig is (begin − 15 min tot eind),
 * anders de (resterende) diensten van de eerstvolgende zondag, of null (basis blijft staan).
 */
export function stripStaat(items: AgendaItem[], nu: Date): StripStaat | null {
  const diensten = items.filter((i) => !i.heleDag && /dienst/i.test(i.titel));
  const t = nu.getTime();

  const live = diensten.find((i) => i.start.getTime() - 15 * MINUUT <= t && t < i.end.getTime());
  if (live) return { staat: 'live', tijd: tijd(live.start), omschrijving: dienstOmschrijving(live.titel) };

  // Eerstvolgende zondag met diensten; van vandaag alleen wat nog komt
  const zondag = diensten.filter((i) => isZondag(i.start) && i.end.getTime() > t);
  const eerste = zondag[0];
  if (!eerste) return null;
  const sleutel = dagSleutel(eerste.start);
  return {
    staat: 'geladen',
    dag: fDag.format(eerste.start),
    maand: maandKort(eerste.start),
    datum: dagMaand(eerste.start),
    diensten: zondag
      .filter((i) => dagSleutel(i.start) === sleutel)
      .map((i) => ({ tijd: tijd(i.start), omschrijving: dienstOmschrijving(i.titel) })),
  };
}

/** Horizon in ms voor `weken` weken. */
export const horizon = (nu: Date, weken: number) => new Date(nu.getTime() + weken * 7 * DAG);
