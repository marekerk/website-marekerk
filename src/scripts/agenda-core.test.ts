// Run with `npm test` (TZ=UTC, so the test doesn't silently rely on the machine's Dutch time zone).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { horizon, listRows, parseAgenda, preacher, serviceDescription, stripState } from './agenda-core.ts';

const ics = readFileSync(new URL('./__fixtures__/agenda.ics', import.meta.url), 'utf8');
const NOW = new Date('2026-10-07T10:00:00Z'); // Wednesday 7 October, 12.00 in Amsterdam
const items = (now = NOW, weeks = 8) => parseAgenda(ics, now, horizon(now, weeks));

test('list: first four upcoming items, formatted in Dutch', () => {
  assert.deepEqual(listRows(items(), NOW, 4), [
    { day: '11', month: 'okt', title: 'Morgendienst - Ds. T. Jacobs', subtitle: 'Marekerk', time: '10.00' },
    { day: '11', month: 'okt', title: 'Middagdienst · Ds. T. Jacobs', subtitle: 'Leerdienst', time: '17.00' },
    { day: '15', month: 'okt', title: 'Kennismakingsavond', subtitle: 'Marehuis', time: '20.00' },
    { day: '18', month: 'okt', title: 'Morgendienst - Ds. J. de Vries (Delft)', subtitle: 'Marekerk', time: '10.00' },
  ]);
});

test('list: concert (UTC time), floating time, all day; cancelled is dropped', () => {
  const rows = listRows(items(), NOW);
  const find = (title: string) => rows.find((r) => r.title === title);
  assert.deepEqual(find('Concert in de kerk'), { day: '24', month: 'okt', title: 'Concert in de kerk', subtitle: 'Zaterdagmiddag', time: '15.00' });
  assert.equal(find('Bijbelkring')?.time, '20.00');
  assert.deepEqual(find('Gemeentedag'), { day: '7', month: 'nov', title: 'Gemeentedag', subtitle: '', time: 'hele dag' });
  assert.equal(find('Bazaar'), undefined);
});

test('recurrence: stays 10.00 across the switch to winter time; EXDATE is skipped', () => {
  const nov1 = items().filter((i) => i.start.toISOString().startsWith('2026-11-01'));
  assert.deepEqual(nov1.map((i) => [i.title, i.start.toISOString()]), [['Morgendienst - Ds. T. Jacobs', '2026-11-01T09:00:00.000Z']]);
  const oct11 = items().find((i) => i.start.toISOString().startsWith('2026-10-11T08'));
  assert.equal(oct11?.title, 'Morgendienst - Ds. T. Jacobs'); // summer time: 10.00 = 08.00Z
});

test('horizon: data-weeks limits the expansion', () => {
  const titles = items(NOW, 1).map((i) => i.title);
  assert.deepEqual(titles, ['Morgendienst - Ds. T. Jacobs', 'Middagdienst · Ds. T. Jacobs']);
  const six = items(NOW, 6);
  assert.ok(six.every((i) => i.start < horizon(NOW, 6)));
  assert.equal(six.filter((i) => i.title.startsWith('Morgendienst')).length, 6);
});

test('strip: next Sunday with services and preachers', () => {
  assert.deepEqual(stripState(items(), NOW), {
    state: 'loaded',
    day: '11',
    month: 'okt',
    date: '11 oktober',
    services: [
      { time: '10.00', description: 'Morgendienst · Ds. T. Jacobs' },
      { time: '17.00', description: 'Middagdienst · Ds. T. Jacobs' },
    ],
  });
  const afterAfternoon = new Date('2026-10-11T16:15:00Z'); // 18.15, afternoon service just ended
  assert.deepEqual(stripState(items(afterAfternoon), afterAfternoon), {
    state: 'loaded',
    day: '18',
    month: 'okt',
    date: '18 oktober',
    services: [
      { time: '10.00', description: 'Morgendienst · Ds. J. de Vries (Delft)' },
      { time: '17.00', description: 'Middagdienst · Ds. T. Jacobs' },
    ],
  });
});

test('strip: live from 15 minutes before start until the end', () => {
  const at = (iso: string) => {
    const now = new Date(iso);
    return stripState(items(now), now);
  };
  assert.equal(at('2026-10-11T07:44:00Z')?.state, 'loaded'); // 09.44
  assert.deepEqual(at('2026-10-11T07:45:00Z'), { state: 'live', time: '10.00', description: 'Morgendienst · Ds. T. Jacobs' });
  assert.equal(at('2026-10-11T09:29:00Z')?.state, 'live'); // 11.29
  // 11.30: morning service over; the strip shows what is still to come that Sunday
  assert.deepEqual(at('2026-10-11T09:30:00Z'), {
    state: 'loaded',
    day: '11',
    month: 'okt',
    date: '11 oktober',
    services: [{ time: '17.00', description: 'Middagdienst · Ds. T. Jacobs' }],
  });
  // 1 Nov 16.50: afternoon service removed (EXDATE), so not live and on to 8 November
  const nov1 = at('2026-11-01T15:50:00Z');
  assert.equal(nov1?.state, 'loaded');
  assert.equal(nov1?.state === 'loaded' && nov1.date, '8 november');
  assert.deepEqual(at('2026-11-08T15:50:00Z'), { state: 'live', time: '17.00', description: 'Middagdienst · Ds. T. Jacobs' });
});

test('preacher: strips the service word and separators, otherwise the summary', () => {
  assert.equal(preacher('Morgendienst - Ds. T. Jacobs'), 'Ds. T. Jacobs');
  assert.equal(preacher('Middagdienst · ds. A. Bakker'), 'ds. A. Bakker');
  assert.equal(preacher('Ds. A. Bakker – middagdienst'), 'Ds. A. Bakker');
  assert.equal(preacher('MORGENDIENST: Prop. K. Smit'), 'Prop. K. Smit');
  assert.equal(preacher('Morgendienst'), 'Morgendienst');
  assert.equal(preacher('Jeugddienst'), 'Jeugddienst');
});

test('serviceDescription: service kind · preacher, otherwise the summary', () => {
  assert.equal(serviceDescription('Morgendienst - Ds. T. Jacobs'), 'Morgendienst · Ds. T. Jacobs');
  assert.equal(serviceDescription('Ds. A. Bakker – middagdienst'), 'Middagdienst · Ds. A. Bakker');
  assert.equal(serviceDescription('Morgendienst'), 'Morgendienst');
  assert.equal(serviceDescription('Jeugddienst met de muziekgroep'), 'Jeugddienst met de muziekgroep');
});

test('empty and broken feeds', () => {
  const empty = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n';
  assert.deepEqual(parseAgenda(empty, NOW, horizon(NOW, 8)), []);
  assert.equal(stripState([], NOW), null);
  assert.deepEqual(listRows([], NOW, 4), []);
  assert.throws(() => parseAgenda('<html>not found</html>', NOW, horizon(NOW, 8)));
});

test('TZID=Europe/Amsterdam without VTIMEZONE in the feed', () => {
  const withoutTz = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', 'UID:x', 'DTSTART;TZID=Europe/Amsterdam:20261108T100000',
    'DTEND;TZID=Europe/Amsterdam:20261108T113000', 'SUMMARY:Morgendienst', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const [i] = parseAgenda(withoutTz, NOW, horizon(NOW, 8));
  assert.equal(i?.start.toISOString(), '2026-11-08T09:00:00.000Z');
});

const cal = (...lines: string[]) => ['BEGIN:VCALENDAR', 'VERSION:2.0', ...lines, 'END:VCALENDAR'].join('\r\n');
const ev = (...lines: string[]) => ['BEGIN:VEVENT', ...lines, 'END:VEVENT'];

test('RECURRENCE-ID only belongs to the series with the same UID', () => {
  const feed = cal(
    ...ev('UID:morning', 'DTSTART;TZID=Europe/Amsterdam:20261011T100000', 'DTEND;TZID=Europe/Amsterdam:20261011T113000',
      'RRULE:FREQ=WEEKLY;BYDAY=SU;COUNT=2', 'SUMMARY:Morgendienst - Ds. A'),
    ...ev('UID:kids', 'DTSTART;TZID=Europe/Amsterdam:20261011T100000', 'DTEND;TZID=Europe/Amsterdam:20261011T113000',
      'RRULE:FREQ=WEEKLY;BYDAY=SU;COUNT=2', 'SUMMARY:Kinderkerk'),
    ...ev('UID:morning', 'RECURRENCE-ID;TZID=Europe/Amsterdam:20261011T100000', 'DTSTART;TZID=Europe/Amsterdam:20261011T100000',
      'DTEND;TZID=Europe/Amsterdam:20261011T113000', 'SUMMARY:Morgendienst - Ds. B'),
  );
  const oct11 = parseAgenda(feed, NOW, horizon(NOW, 8))
    .filter((i) => i.start.toISOString().startsWith('2026-10-11'))
    .map((i) => i.title)
    .sort();
  assert.deepEqual(oct11, ['Kinderkerk', 'Morgendienst - Ds. B']);
});

test('an occurrence moved far away does not stop expanding the series', () => {
  const feed = cal(
    ...ev('UID:series', 'DTSTART;TZID=Europe/Amsterdam:20261011T100000', 'DTEND;TZID=Europe/Amsterdam:20261011T113000',
      'RRULE:FREQ=WEEKLY;BYDAY=SU', 'SUMMARY:Morgendienst'),
    ...ev('UID:series', 'RECURRENCE-ID;TZID=Europe/Amsterdam:20261011T100000', 'DTSTART;TZID=Europe/Amsterdam:20261220T100000',
      'DTEND;TZID=Europe/Amsterdam:20261220T113000', 'SUMMARY:Morgendienst (verplaatst)'),
    ...ev('UID:series', 'RECURRENCE-ID;TZID=Europe/Amsterdam:20270103T100000', 'DTSTART;TZID=Europe/Amsterdam:20261024T100000',
      'DTEND;TZID=Europe/Amsterdam:20261024T113000', 'SUMMARY:Morgendienst (naar voren)'),
  );
  const dates = parseAgenda(feed, NOW, horizon(NOW, 3)).map((i) => `${i.start.toISOString().slice(0, 10)} ${i.title}`);
  assert.deepEqual(dates, ['2026-10-18 Morgendienst', '2026-10-24 Morgendienst (naar voren)', '2026-10-25 Morgendienst']);
});

test('long daily series: the safety limit only counts from the window', () => {
  const feed = cal(
    ...ev('UID:daily', 'DTSTART;TZID=Europe/Amsterdam:20050101T100000', 'DTEND;TZID=Europe/Amsterdam:20050101T113000',
      'RRULE:FREQ=DAILY', 'SUMMARY:Ochtendgebed'),
  );
  // 7 Oct 10.00–11.30 is already over at 12.00; 8 through 14 Oct fall within the one-week window
  const dates = parseAgenda(feed, NOW, horizon(NOW, 1)).map((i) => i.start.toISOString().slice(0, 10));
  assert.deepEqual(dates, ['2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14']);
});
