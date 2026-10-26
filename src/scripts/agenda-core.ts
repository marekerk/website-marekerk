/**
 * Pure agenda logic (no DOM): parse ICS, expand recurrences, and derive the data
 * for the agenda list and the service-times strip. All times in Europe/Amsterdam.
 * Tested with node:test (npm test); the DOM side lives in agenda.ts.
 */
import ICAL from 'ical.js';

type IcalTime = InstanceType<typeof ICAL.Time>;
type IcalEvent = InstanceType<typeof ICAL.Event>;
type IcalComponent = InstanceType<typeof ICAL.Component>;

export const TIME_ZONE = 'Europe/Amsterdam';

export interface AgendaItem {
  start: Date;
  end: Date;
  /** ICS SUMMARY */
  title: string;
  /** ICS LOCATION */
  location: string;
  /** ICS DESCRIPTION */
  description: string;
  allDay: boolean;
}

export interface ListRow {
  day: string;
  month: string;
  title: string;
  subtitle: string;
  time: string;
}

export type StripState =
  | { state: 'live'; time: string; description: string }
  | {
      state: 'loaded';
      /** Octagon date: "11" and "okt". */
      day: string;
      month: string;
      /** Lockup line below "Zondag": "11 oktober". */
      date: string;
      /** "10.00" with "Morgendienst · Ds. J. de Vries". */
      services: { time: string; description: string }[];
    };

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
/** Safety limit per recurring event (occurrences from the start of the window). */
const MAX_OCCURRENCES = 5000;
/** Hard upper bound on iterations, also before the window (against pathological rules such as FREQ=MINUTELY). */
const MAX_ITERATIONS = 100000;

// Read feeds correctly that refer to Europe/Amsterdam without including a VTIMEZONE.
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

let tzRegistered = false;
function registerAmsterdam(): void {
  if (tzRegistered || ICAL.TimezoneService.has(TIME_ZONE)) return;
  const vtz = new ICAL.Component(ICAL.parse(AMSTERDAM_VTIMEZONE)).getFirstSubcomponent('vtimezone');
  if (vtz) ICAL.TimezoneService.register(vtz);
  tzRegistered = true;
}

/** UTC offset (ms) of `tz` at instant `ms`. */
function offset(ms: number, tz = TIME_ZONE): number {
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
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/** Wall-clock time in Amsterdam → Date. */
export function amsterdamTime(y: number, mo: number, d: number, h = 0, min = 0, s = 0): Date {
  const guess = Date.UTC(y, mo - 1, d, h, min, s);
  const o1 = offset(guess - offset(guess));
  return new Date(guess - o1);
}

function toDate(t: IcalTime): Date {
  // All-day and floating times (or an unknown TZID) count as Amsterdam wall-clock time.
  if (t.isDate || t.zone === ICAL.Timezone.localTimezone) {
    return amsterdamTime(t.year, t.month, t.day, t.hour, t.minute, t.second);
  }
  return t.toJSDate();
}

function text(e: IcalEvent, field: 'location' | 'description'): string {
  const v = e[field];
  return typeof v === 'string' ? v.trim() : '';
}

function createItem(e: IcalEvent, start: IcalTime, end: IcalTime): AgendaItem {
  const s = toDate(start);
  let en = toDate(end);
  // Without a (valid) end: all day = one day, otherwise 90 minutes (length of a service)
  if (en.getTime() <= s.getTime()) en = new Date(s.getTime() + (start.isDate ? DAY : 90 * MINUTE));
  return {
    start: s,
    end: en,
    title: (e.summary ?? '').trim(),
    location: text(e, 'location'),
    description: text(e, 'description'),
    allDay: start.isDate,
  };
}

function isCancelled(c: IcalComponent): boolean {
  return String(c.getFirstPropertyValue('status') ?? '').toUpperCase() === 'CANCELLED';
}

/**
 * Parse ICS text and return all (expanded) events that overlap [from, to),
 * sorted by start. Throws on invalid ICS.
 */
export function parseAgenda(ics: string, from: Date, to: Date): AgendaItem[] {
  registerAmsterdam();
  const calendar = new ICAL.Component(ICAL.parse(ics));
  const vevents = calendar.getAllSubcomponents('vevent');

  // Link exceptions (RECURRENCE-ID) to their series
  const series = new Map<string, IcalEvent>();
  const single: IcalEvent[] = [];
  const exceptions: IcalEvent[] = [];
  for (const c of vevents) {
    // Empty exceptions: otherwise ical.js links ALL RECURRENCE-IDs in the feed, regardless of UID
    const e = new ICAL.Event(c, { exceptions: [], strictExceptions: true });
    if (e.isRecurrenceException()) exceptions.push(e);
    else {
      if (isCancelled(c)) continue;
      if (e.isRecurring()) series.set(e.uid, e);
      else single.push(e);
    }
  }
  for (const x of exceptions) {
    const parent = series.get(x.uid);
    if (parent) parent.relateException(x);
    else if (!isCancelled(x.component)) single.push(x);
  }

  const fromMs = from.getTime();
  const toMs = to.getTime();
  const items: AgendaItem[] = [];
  const inWindow = (i: AgendaItem) => i.end.getTime() > fromMs && i.start.getTime() < toMs;

  for (const e of single) {
    if (!e.startDate) continue;
    const i = createItem(e, e.startDate, e.endDate ?? e.startDate);
    if (inWindow(i)) items.push(i);
  }

  for (const e of series.values()) {
    const handled = new Set<IcalEvent>();
    // Not iterator(from): that re-anchors the rule on `from` (COUNT/INTERVAL would be off)
    const it = e.iterator();
    let n = 0;
    let iterations = 0;
    for (let next = it.next(); next && n < MAX_OCCURRENCES && iterations++ < MAX_ITERATIONS; next = it.next()) {
      // Stop on the original date; a moved occurrence counts on its own date
      const ms = toDate(next).getTime();
      if (ms >= toMs) break;
      // Only occurrences from `from` count towards the limit, otherwise old series drop out
      if (ms >= fromMs) n++;
      const d = e.getOccurrenceDetails(next);
      if (d.item !== e) handled.add(d.item);
      if (isCancelled(d.item.component)) continue;
      const i = createItem(d.item, d.startDate, d.endDate);
      if (inWindow(i)) items.push(i);
    }
    // Occurrences moved from beyond the horizon to within it
    for (const x of Object.values(e.exceptions) as IcalEvent[]) {
      if (handled.has(x) || isCancelled(x.component) || !x.startDate) continue;
      const i = createItem(x, x.startDate, x.endDate ?? x.startDate);
      if (inWindow(i)) items.push(i);
    }
  }

  return items.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/* ---------- Formatting (nl-NL, Amsterdam) ---------- */

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('nl-NL', { timeZone: TIME_ZONE, ...o });
const fDay = fmt({ day: 'numeric' });
const fMonth = fmt({ month: 'short' });
const fTime = fmt({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const fWeekday = fmt({ weekday: 'long' });
const fDayMonth = fmt({ day: 'numeric', month: 'long' });
const fDayKey = fmt({ year: 'numeric', month: '2-digit', day: '2-digit' });

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "10.00" */
export const formatTime = (d: Date) => fTime.format(d).replace(':', '.');
/** "12 oktober" */
export const formatDayMonth = (d: Date) => fDayMonth.format(d);
/** "okt" (without the period) */
const shortMonth = (d: Date) => fMonth.format(d).replace(/\.$/, '');
const isSunday = (d: Date) => fWeekday.format(d) === 'zondag';
const dayKey = (d: Date) => fDayKey.format(d);

/** Location, otherwise the first non-empty line of the description. */
function subtitle(i: AgendaItem): string {
  if (i.location) return i.location;
  return i.description.split(/\r?\n/).map((r) => r.trim()).find(Boolean) ?? '';
}

/* ---------- List ---------- */

/** Upcoming items (starting from now; today's all-day items count), at most `limit`. */
export function listRows(items: AgendaItem[], now: Date, limit?: number): ListRow[] {
  const upcoming = items.filter((i) => (i.allDay ? i.end > now : i.start >= now));
  return upcoming.slice(0, limit && limit > 0 ? limit : undefined).map((i) => ({
    day: fDay.format(i.start),
    month: shortMonth(i.start),
    title: i.title,
    subtitle: subtitle(i),
    time: i.allDay ? 'hele dag' : formatTime(i.start),
  }));
}

/* ---------- Strip ---------- */

// Matches the Dutch service names in the feed ("morgendienst", "middagdienst")
const SERVICE_KIND = /\b(morgen|middag)dienst\b/i;
const EDGE = /^[\s\-–—·•:|,/]+|[\s\-–—·•:|,/]+$/g;

/** "Morgendienst - Ds. J. de Vries" → "Ds. J. de Vries"; if nothing is left, the summary. */
export function preacher(summary: string): string {
  const rest = summary.replace(new RegExp(SERVICE_KIND.source, 'gi'), ' ').replace(EDGE, '').replace(/\s{2,}/g, ' ');
  return rest || summary.trim();
}

/** "Morgendienst - Ds. J. de Vries" → "Morgendienst · Ds. J. de Vries"; without a service kind, the summary. */
export function serviceDescription(summary: string): string {
  const kind = summary.match(SERVICE_KIND);
  const name = preacher(summary);
  return kind && name !== summary.trim() ? `${capitalize(kind[0].toLowerCase())} · ${name}` : summary.trim();
}

/**
 * State of the service-times strip: "live" while a service is on (start − 15 min until end),
 * otherwise the (remaining) services of the next Sunday, or null (the static base stays).
 */
export function stripState(items: AgendaItem[], now: Date): StripState | null {
  const services = items.filter((i) => !i.allDay && /dienst/i.test(i.title));
  const t = now.getTime();

  const live = services.find((i) => i.start.getTime() - 15 * MINUTE <= t && t < i.end.getTime());
  if (live) return { state: 'live', time: formatTime(live.start), description: serviceDescription(live.title) };

  // Next Sunday with services; for today only what is still to come
  const sunday = services.filter((i) => isSunday(i.start) && i.end.getTime() > t);
  const first = sunday[0];
  if (!first) return null;
  const key = dayKey(first.start);
  return {
    state: 'loaded',
    day: fDay.format(first.start),
    month: shortMonth(first.start),
    date: formatDayMonth(first.start),
    services: sunday
      .filter((i) => dayKey(i.start) === key)
      .map((i) => ({ time: formatTime(i.start), description: serviceDescription(i.title) })),
  };
}

/** Horizon `weeks` weeks after `now`. */
export const horizon = (now: Date, weeks: number) => new Date(now.getTime() + weeks * 7 * DAY);
