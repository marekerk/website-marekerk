/**
 * Externe links en adressen die op meerdere plekken terugkomen.
 * Waarden met '#' zijn nog plaatshouders uit het ontwerp (adres nog niet bekend).
 */
export const YOUTUBE_URL = '#youtube';
export const KERKOMROEP_URL = '#kerkomroep';
/** Externe agenda (knop "Open de agenda" in de foutstaat). */
export const AGENDA_EXTERN_URL = '#agenda-extern';

/** Abonneren op de ICS-feed (webcal://...). */
export const AGENDA_WEBCAL_URL: string = import.meta.env.PUBLIC_AGENDA_WEBCAL_URL || '#';

export const CONTACT = {
  naam: 'Ds. Ton Jacobs',
  email: 'dstjacobs@gmail.com',
  telefoon: '071-8870207',
  telefoonHref: 'tel:0718870207',
} as const;
