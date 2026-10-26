import { href } from './url';

/**
 * External links and addresses used in several places.
 * Values with '#' are still placeholders from the design (address not known yet).
 */
export const YOUTUBE_URL = '#youtube';
export const KERKOMROEP_URL = '#kerkomroep';
/** External agenda ("Open de agenda" button in the error state). */
export const AGENDA_EXTERNAL_URL = '#agenda-extern';

/** Subscribe to the ICS feed (webcal://...). Without: to the subscribe line on Kerkdiensten (#ics). */
export const AGENDA_WEBCAL_URL: string = import.meta.env.PUBLIC_AGENDA_WEBCAL_URL || href('/kerkdiensten/#ics');

export const CONTACT = {
  name: 'Ds. Ton Jacobs',
  email: 'dstjacobs@gmail.com',
  phone: '071-8870207',
  phoneHref: 'tel:0718870207',
} as const;
