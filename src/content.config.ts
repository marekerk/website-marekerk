import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Page copy lives in /content: one folder per page, one .md per section or card.
 * Frontmatter holds the structured bits (heading, label, buttons, short lists);
 * the body holds paragraphs and bullet lists. See content/README.md.
 */
const button = z.object({
  text: z.string(),
  /** Internal path ('/kerkdiensten/'), anchor, mailto:, tel: or external URL. */
  link: z.string(),
});

const item = z.object({
  label: z.string().optional(),
  title: z.string().optional(),
  text: z.string().optional(),
  link: z.string().optional(),
  day: z.string().optional(),
  month: z.string().optional(),
});

const blocks = defineCollection({
  // Only files inside a page folder; content/README.md is for editors.
  loader: glob({ pattern: '*/**/*.md', base: './content' }),
  schema: z.object({
    /** <title> of the page (hero blocks), when it differs from `title`. */
    metaTitle: z.string().optional(),
    /** <meta name="description"> (hero blocks). */
    description: z.string().optional(),
    label: z.string().optional(),
    title: z.string().optional(),
    /** Light Italic line under the title, as in the logo lockup (homepage: "bij de Marekerk gemeente"). */
    subtitle: z.string().optional(),
    /** Large number or short phrase that stands out (e.g. a year). */
    highlight: z.string().optional(),
    /** Lead text shown apart from the body (e.g. the left column of a two-column section). */
    intro: z.string().optional(),
    caption: z.string().optional(),
    /** Card spans the full width of its grid. */
    wide: z.boolean().default(false),
    buttons: z.array(button).default([]),
    items: z.array(item).default([]),
  }),
});

export const collections = { blocks };
