/**
 * Internal link or asset path prefixed with the Astro `base`. On Azure Static Web Apps
 * `base` is empty; going through href() keeps the site working if it ever moves under a subpath.
 *
 *   href('/')                   -> '/'          (with base '/sub': '/sub/')
 *   href('/kerkdiensten/#live') -> '/kerkdiensten/#live'
 *
 * Always pass paths with a leading slash and (for pages) a trailing slash.
 * External links, mailto:, tel: and bare #anchors are returned unchanged.
 */
export function href(path: string): string {
  if (!path.startsWith('/')) return path;
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  return `${base}${path}`;
}
