// Draai met `npm test` (TZ=UTC, zodat de test niet stilletjes op de Nederlandse tijdzone van de machine leunt).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { horizon, lijstRijen, parseAgenda, stripStaat, voorganger } from './agenda-core.ts';

const ics = readFileSync(new URL('./__fixtures__/agenda.ics', import.meta.url), 'utf8');
const NU = new Date('2026-10-07T10:00:00Z'); // woensdag 7 oktober, 12.00 in Amsterdam
const items = (nu = NU, weken = 8) => parseAgenda(ics, nu, horizon(nu, weken));

test('lijst: eerste vier komende items, Nederlands geformatteerd', () => {
  assert.deepEqual(lijstRijen(items(), NU, 4), [
    { dag: '11', maand: 'okt', titel: 'Morgendienst - Ds. T. Jacobs', omschrijving: 'Marekerk', tijd: '10.00' },
    { dag: '11', maand: 'okt', titel: 'Middagdienst · Ds. T. Jacobs', omschrijving: 'Leerdienst', tijd: '17.00' },
    { dag: '15', maand: 'okt', titel: 'Kennismakingsavond', omschrijving: 'Marehuis', tijd: '20.00' },
    { dag: '18', maand: 'okt', titel: 'Morgendienst - Ds. J. de Vries (Delft)', omschrijving: 'Marekerk', tijd: '10.00' },
  ]);
});

test('lijst: concert (UTC-tijd), zwevende tijd, hele dag; geannuleerd valt weg', () => {
  const rijen = lijstRijen(items(), NU);
  const zoek = (titel: string) => rijen.find((r) => r.titel === titel);
  assert.deepEqual(zoek('Concert in de kerk'), { dag: '24', maand: 'okt', titel: 'Concert in de kerk', omschrijving: 'Zaterdagmiddag', tijd: '15.00' });
  assert.equal(zoek('Bijbelkring')?.tijd, '20.00');
  assert.deepEqual(zoek('Gemeentedag'), { dag: '7', maand: 'nov', titel: 'Gemeentedag', omschrijving: '', tijd: 'hele dag' });
  assert.equal(zoek('Bazaar'), undefined);
});

test('herhaling: over de wintertijd heen blijft het 10.00; EXDATE wordt overgeslagen', () => {
  const nov1 = items().filter((i) => i.start.toISOString().startsWith('2026-11-01'));
  assert.deepEqual(nov1.map((i) => [i.titel, i.start.toISOString()]), [['Morgendienst - Ds. T. Jacobs', '2026-11-01T09:00:00.000Z']]);
  const okt11 = items().find((i) => i.start.toISOString().startsWith('2026-10-11T08'));
  assert.equal(okt11?.titel, 'Morgendienst - Ds. T. Jacobs'); // zomertijd: 10.00 = 08.00Z
});

test('horizon: data-weeks begrenst de uitrol', () => {
  const titels = items(NU, 1).map((i) => i.titel);
  assert.deepEqual(titels, ['Morgendienst - Ds. T. Jacobs', 'Middagdienst · Ds. T. Jacobs']);
  const zes = items(NU, 6);
  assert.ok(zes.every((i) => i.start < horizon(NU, 6)));
  assert.equal(zes.filter((i) => i.titel.startsWith('Morgendienst')).length, 6);
});

test('strip: eerstvolgende zondag met diensten en voorgangers', () => {
  assert.deepEqual(stripStaat(items(), NU), {
    staat: 'geladen',
    datum: 'Zondag 11 oktober',
    diensten: [
      { tijd: '10.00', voorganger: 'Ds. T. Jacobs' },
      { tijd: '17.00', voorganger: 'Ds. T. Jacobs' },
    ],
  });
  const naMiddag = new Date('2026-10-11T16:15:00Z'); // 18.15, middagdienst net afgelopen
  assert.deepEqual(stripStaat(items(naMiddag), naMiddag), {
    staat: 'geladen',
    datum: 'Zondag 18 oktober',
    diensten: [
      { tijd: '10.00', voorganger: 'Ds. J. de Vries (Delft)' },
      { tijd: '17.00', voorganger: 'Ds. T. Jacobs' },
    ],
  });
});

test('strip: live vanaf 15 minuten voor begin tot het eind', () => {
  const op = (iso: string) => {
    const nu = new Date(iso);
    return stripStaat(items(nu), nu);
  };
  assert.equal(op('2026-10-11T07:44:00Z')?.staat, 'geladen'); // 09.44
  assert.deepEqual(op('2026-10-11T07:45:00Z'), { staat: 'live', tijd: '10.00', omschrijving: 'Morgendienst · Ds. T. Jacobs' });
  assert.equal(op('2026-10-11T09:29:00Z')?.staat, 'live'); // 11.29
  // 11.30: morgendienst voorbij; de strip toont wat er die zondag nog komt
  assert.deepEqual(op('2026-10-11T09:30:00Z'), {
    staat: 'geladen',
    datum: 'Zondag 11 oktober',
    diensten: [{ tijd: '17.00', voorganger: 'Ds. T. Jacobs' }],
  });
  // 1 nov 16.50: middagdienst geschrapt (EXDATE), dus geen live en door naar 8 november
  const nov1 = op('2026-11-01T15:50:00Z');
  assert.equal(nov1?.staat, 'geladen');
  assert.equal(nov1?.staat === 'geladen' && nov1.datum, 'Zondag 8 november');
  assert.deepEqual(op('2026-11-08T15:50:00Z'), { staat: 'live', tijd: '17.00', omschrijving: 'Middagdienst · Ds. T. Jacobs' });
});

test('voorganger: dienstwoord en scheidingstekens eraf, anders de samenvatting', () => {
  assert.equal(voorganger('Morgendienst - Ds. T. Jacobs'), 'Ds. T. Jacobs');
  assert.equal(voorganger('Middagdienst · ds. A. Bakker'), 'ds. A. Bakker');
  assert.equal(voorganger('Ds. A. Bakker – middagdienst'), 'Ds. A. Bakker');
  assert.equal(voorganger('MORGENDIENST: Prop. K. Smit'), 'Prop. K. Smit');
  assert.equal(voorganger('Morgendienst'), 'Morgendienst');
  assert.equal(voorganger('Jeugddienst'), 'Jeugddienst');
});

test('lege en kapotte feeds', () => {
  const leeg = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n';
  assert.deepEqual(parseAgenda(leeg, NU, horizon(NU, 8)), []);
  assert.equal(stripStaat([], NU), null);
  assert.deepEqual(lijstRijen([], NU, 4), []);
  assert.throws(() => parseAgenda('<html>niet gevonden</html>', NU, horizon(NU, 8)));
});

test('TZID=Europe/Amsterdam zonder VTIMEZONE in de feed', () => {
  const zonder = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', 'UID:x', 'DTSTART;TZID=Europe/Amsterdam:20261108T100000',
    'DTEND;TZID=Europe/Amsterdam:20261108T113000', 'SUMMARY:Morgendienst', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const [i] = parseAgenda(zonder, NU, horizon(NU, 8));
  assert.equal(i?.start.toISOString(), '2026-11-08T09:00:00.000Z');
});

const kal = (...regels: string[]) => ['BEGIN:VCALENDAR', 'VERSION:2.0', ...regels, 'END:VCALENDAR'].join('\r\n');
const ev = (...regels: string[]) => ['BEGIN:VEVENT', ...regels, 'END:VEVENT'];

test('RECURRENCE-ID hoort alleen bij de reeks met dezelfde UID', () => {
  const feed = kal(
    ...ev('UID:morgen', 'DTSTART;TZID=Europe/Amsterdam:20261011T100000', 'DTEND;TZID=Europe/Amsterdam:20261011T113000',
      'RRULE:FREQ=WEEKLY;BYDAY=SU;COUNT=2', 'SUMMARY:Morgendienst - Ds. A'),
    ...ev('UID:kinderkerk', 'DTSTART;TZID=Europe/Amsterdam:20261011T100000', 'DTEND;TZID=Europe/Amsterdam:20261011T113000',
      'RRULE:FREQ=WEEKLY;BYDAY=SU;COUNT=2', 'SUMMARY:Kinderkerk'),
    ...ev('UID:morgen', 'RECURRENCE-ID;TZID=Europe/Amsterdam:20261011T100000', 'DTSTART;TZID=Europe/Amsterdam:20261011T100000',
      'DTEND;TZID=Europe/Amsterdam:20261011T113000', 'SUMMARY:Morgendienst - Ds. B'),
  );
  const okt11 = parseAgenda(feed, NU, horizon(NU, 8))
    .filter((i) => i.start.toISOString().startsWith('2026-10-11'))
    .map((i) => i.titel)
    .sort();
  assert.deepEqual(okt11, ['Kinderkerk', 'Morgendienst - Ds. B']);
});

test('een ver verplaatst exemplaar stopt de uitrol van de reeks niet', () => {
  const feed = kal(
    ...ev('UID:reeks', 'DTSTART;TZID=Europe/Amsterdam:20261011T100000', 'DTEND;TZID=Europe/Amsterdam:20261011T113000',
      'RRULE:FREQ=WEEKLY;BYDAY=SU', 'SUMMARY:Morgendienst'),
    ...ev('UID:reeks', 'RECURRENCE-ID;TZID=Europe/Amsterdam:20261011T100000', 'DTSTART;TZID=Europe/Amsterdam:20261220T100000',
      'DTEND;TZID=Europe/Amsterdam:20261220T113000', 'SUMMARY:Morgendienst (verplaatst)'),
    ...ev('UID:reeks', 'RECURRENCE-ID;TZID=Europe/Amsterdam:20270103T100000', 'DTSTART;TZID=Europe/Amsterdam:20261024T100000',
      'DTEND;TZID=Europe/Amsterdam:20261024T113000', 'SUMMARY:Morgendienst (naar voren)'),
  );
  const datums = parseAgenda(feed, NU, horizon(NU, 3)).map((i) => `${i.start.toISOString().slice(0, 10)} ${i.titel}`);
  assert.deepEqual(datums, ['2026-10-18 Morgendienst', '2026-10-24 Morgendienst (naar voren)', '2026-10-25 Morgendienst']);
});

test('lange dagelijkse reeks: de veiligheidsgrens telt pas vanaf het venster', () => {
  const feed = kal(
    ...ev('UID:dagelijks', 'DTSTART;TZID=Europe/Amsterdam:20050101T100000', 'DTEND;TZID=Europe/Amsterdam:20050101T113000',
      'RRULE:FREQ=DAILY', 'SUMMARY:Ochtendgebed'),
  );
  // 7 okt 10.00–11.30 is om 12.00 al voorbij; 8 t/m 14 okt vallen in het venster van een week
  const datums = parseAgenda(feed, NU, horizon(NU, 1)).map((i) => i.start.toISOString().slice(0, 10));
  assert.deepEqual(datums, ['2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14']);
});
