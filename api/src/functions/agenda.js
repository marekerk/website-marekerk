/**
 * GET /api/agenda: the church calendar's ICS feed, served from the same domain as the site
 * (so no CORS needed). The feed URL is the ICS_URL app setting (see infra/main.bicep).
 */
import { app } from '@azure/functions';
import { CACHE_SECONDS, createAgendaSource } from '../agenda.js';

/** @type {(() => Promise<string>) | null} */
let getAgenda = null;

app.http('agenda', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (_request, context) => {
    const icsUrl = process.env.ICS_URL;
    if (!icsUrl) return { status: 500, body: 'ICS_URL is not configured' };
    getAgenda ??= createAgendaSource({ icsUrl });

    try {
      return {
        status: 200,
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
          'Cache-Control': `public, max-age=${CACHE_SECONDS}`,
        },
        body: await getAgenda(),
      };
    } catch (error) {
      context.warn('Could not fetch calendar:', error);
      return { status: 502, body: 'Calendar unavailable' };
    }
  },
});
