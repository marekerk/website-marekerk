/**
 * Interne link of asset-pad met de Astro `base` ervoor, zodat de site ook werkt
 * onder een submap (bijv. https://marekerk.github.io/website-marekerk/).
 *
 *   href('/')                   -> '/website-marekerk/'
 *   href('/kerkdiensten/#live') -> '/website-marekerk/kerkdiensten/#live'
 *
 * Geef paden altijd met een leidende slash en (voor pagina's) een slash aan het eind.
 * Externe links, mailto:, tel: en losse #ankers gaan ongewijzigd terug.
 */
export function href(path: string): string {
  if (!path.startsWith('/')) return path;
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  return `${base}${path}`;
}
