/**
 * Cloudflare Worker: geeft de ICS-feed van de kerkelijke agenda door mét CORS-header,
 * zodat de website hem in de browser kan ophalen. Cachet 5 minuten.
 *
 * Env (Worker-variabelen):
 *   ICS_URL         feed-URL (https:// of webcal://), verplicht
 *   ALLOWED_ORIGIN  bijv. https://marekerk.nl; zonder waarde: *
 *
 * Bewust geen open proxy: pad en querystring van het verzoek worden genegeerd.
 */
const CACHE_SECONDEN = 300;

export default {
  async fetch(request, env, ctx) {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Accept',
      'Access-Control-Max-Age': '86400',
      ...(env.ALLOWED_ORIGIN ? { Vary: 'Origin' } : {}),
    };

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405, headers: { ...cors, Allow: 'GET, OPTIONS' } });
    }
    if (!env.ICS_URL) return new Response('ICS_URL ontbreekt', { status: 500, headers: cors });

    // Vaste cachesleutel: één feed, ongeacht pad of query
    const cache = caches.default;
    const sleutel = new Request(new URL('/agenda.ics', request.url).toString(), { method: 'GET' });
    const opgeslagen = await cache.match(sleutel);
    if (opgeslagen) return metHeaders(opgeslagen, cors);

    const bron = env.ICS_URL.replace(/^webcal:\/\//i, 'https://');
    let antwoord;
    try {
      // cf.cacheTtl cachet ook op *.workers.dev, waar de Cache API hierboven niets doet
      antwoord = await fetch(bron, {
        headers: { Accept: 'text/calendar, */*;q=0.5' },
        cf: { cacheTtl: CACHE_SECONDEN, cacheEverything: true },
      });
    } catch {
      return new Response('Agenda niet bereikbaar', { status: 502, headers: cors });
    }
    if (!antwoord.ok) {
      return new Response(`Agenda gaf ${antwoord.status}`, { status: 502, headers: cors });
    }

    const resultaat = new Response(await antwoord.text(), {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Cache-Control': `public, max-age=${CACHE_SECONDEN}`,
      },
    });
    ctx.waitUntil(cache.put(sleutel, resultaat.clone()));
    return metHeaders(resultaat, cors);
  },
};

function metHeaders(response, extra) {
  const r = new Response(response.body, response);
  for (const [k, v] of Object.entries(extra)) r.headers.set(k, v);
  return r;
}
