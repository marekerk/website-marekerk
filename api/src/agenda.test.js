import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAgendaSource } from './agenda.js';

const ICS = 'BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n';

/** Fake fetch that returns the given responses in order and records the requested URLs. */
function fakeFetch(...responses) {
  const f = async (url) => {
    f.urls.push(url);
    const next = responses.shift();
    if (next instanceof Error) throw next;
    return new Response(next.body, { status: next.status });
  };
  f.urls = [];
  return f;
}

test('fetches the feed and rewrites webcal:// to https://', async () => {
  const fetchFn = fakeFetch({ status: 200, body: ICS });
  const getAgenda = createAgendaSource({ icsUrl: 'webcal://example.com/agenda.ics', fetchFn });
  assert.equal(await getAgenda(), ICS);
  assert.deepEqual(fetchFn.urls, ['https://example.com/agenda.ics']);
});

test('caches for 5 minutes', async () => {
  let t = 0;
  const fetchFn = fakeFetch({ status: 200, body: 'first' }, { status: 200, body: 'second' });
  const getAgenda = createAgendaSource({ icsUrl: 'https://x/a.ics', fetchFn, now: () => t });
  assert.equal(await getAgenda(), 'first');
  t = 299_000;
  assert.equal(await getAgenda(), 'first');
  t = 300_000;
  assert.equal(await getAgenda(), 'second');
  assert.equal(fetchFn.urls.length, 2);
});

test('on a source error: serves the last copy and retries only after a minute', async () => {
  let t = 0;
  const fetchFn = fakeFetch({ status: 200, body: 'old' }, { status: 503 }, { status: 200, body: 'new' });
  const getAgenda = createAgendaSource({ icsUrl: 'https://x/a.ics', fetchFn, now: () => t });
  await getAgenda();
  t = 300_000;
  assert.equal(await getAgenda(), 'old');
  t = 330_000;
  assert.equal(await getAgenda(), 'old');
  assert.equal(fetchFn.urls.length, 2);
  t = 360_000;
  assert.equal(await getAgenda(), 'new');
});

test('without an earlier copy the error propagates', async () => {
  const getAgenda = createAgendaSource({ icsUrl: 'https://x/a.ics', fetchFn: fakeFetch(new Error('gone')) });
  await assert.rejects(getAgenda, /gone/);
});
