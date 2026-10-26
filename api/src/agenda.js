/**
 * Fetches the church calendar's ICS feed and keeps it in memory for 5 minutes.
 * If the source is unreachable, the last fetched copy is returned (when there is one)
 * and the source is retried after a minute.
 *
 * Deliberately not an open proxy: the source only comes from ICS_URL, never from the request.
 * Independent of @azure/functions so it can be tested without the runtime.
 */
export const CACHE_SECONDS = 300;
const RETRY_AFTER_ERROR_MS = 60_000;
const TIMEOUT_MS = 10_000;

/**
 * @param {{ icsUrl: string, fetchFn?: typeof fetch, now?: () => number }} options
 * @returns {() => Promise<string>}
 */
export function createAgendaSource({ icsUrl, fetchFn = fetch, now = Date.now }) {
  const sourceUrl = icsUrl.replace(/^webcal:\/\//i, 'https://');
  /** @type {{ text: string, expiresAt: number } | null} */
  let cached = null;

  return async function getAgenda() {
    if (cached && now() < cached.expiresAt) return cached.text;
    try {
      const response = await fetchFn(sourceUrl, {
        headers: { Accept: 'text/calendar, */*;q=0.5' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`Calendar source returned ${response.status}`);
      cached = { text: await response.text(), expiresAt: now() + CACHE_SECONDS * 1000 };
      return cached.text;
    } catch (error) {
      if (!cached) throw error;
      cached.expiresAt = now() + RETRY_AFTER_ERROR_MS;
      return cached.text;
    }
  };
}
