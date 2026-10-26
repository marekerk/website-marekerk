import { getCollection, getEntry, type CollectionEntry } from 'astro:content';

export type Block = CollectionEntry<'blocks'>;

/** One block by id (`<page>/<file>` without .md); a missing file fails the build. */
export async function block(id: string): Promise<Block> {
  const entry = await getEntry('blocks', id);
  if (!entry) throw new Error(`Missing content file: content/${id}.md`);
  return entry;
}

/** The blocks directly inside `content/<folder>/`, ordered by file name. */
export async function blocksIn(folder: string): Promise<Block[]> {
  const prefix = `${folder}/`;
  const entries = await getCollection('blocks', (entry: Block) =>
    entry.id.startsWith(prefix) && !entry.id.slice(prefix.length).includes('/'));
  return entries.sort((a: Block, b: Block) => a.id.localeCompare(b.id, 'en', { numeric: true }));
}


/**
 * The top-level paragraphs and lists of a block body as HTML, in order.
 * For sections that spread one body over two columns (see <Prose from to>).
 */
export function bodyParts(entry: Block): string[] {
  const html = entry.rendered?.html ?? '';
  return html.match(/<(p|ul|ol|blockquote|h[1-6])\b[\s\S]*?<\/\1>/g) ?? [];
}
