import { toKebabCase } from '@inkdropapp/live-export';

/** Longest description we will derive from a note body. */
const DESCRIPTION_LIMIT = 160;

/**
 * First prose paragraph of a note, flattened to plain text.
 *
 * The posts collection requires `seo.description`, but Inkdrop notes are not
 * written with one. Headings, code and images are skipped so the result reads
 * like a summary rather than the first line of a shell snippet.
 */
export function deriveDescription(mdast) {
  const paragraph = (mdast?.children ?? []).find(
    (node) => node.type === 'paragraph',
  );
  if (!paragraph) return '';

  const text = collectText(paragraph).replace(/\s+/g, ' ').trim();
  if (text.length <= DESCRIPTION_LIMIT) return text;
  // Cut on a word boundary so the description does not end mid-word.
  const cut = text.slice(0, DESCRIPTION_LIMIT);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

function collectText(node) {
  if (node.type === 'text' || node.type === 'inlineCode') return node.value ?? '';
  if (node.type === 'image') return '';
  return (node.children ?? []).map(collectText).join('');
}

/**
 * Rewrite an Inkdrop note's frontmatter in place so it satisfies the `posts`
 * collection schema in src/content.config.ts.
 *
 * `date` is set to a Date instance on purpose: js-yaml serialises it as an
 * unquoted YAML timestamp, which is what `z.date()` accepts. A string would be
 * quoted and fail validation.
 *
 * `image` is deliberately left alone. The schema types it with Astro's
 * `image()` helper, which resolves paths relative to the Markdown file; the
 * public URLs this exporter produces for body images would not validate.
 */
export function applyPostSchema({ note, frontmatter, mdast }) {
  frontmatter.title = note.title;
  frontmatter.date = new Date(note.createdAt);

  const description =
    frontmatter.seo?.description ?? frontmatter.description ?? deriveDescription(mdast);

  frontmatter.seo = {
    ...frontmatter.seo,
    title: frontmatter.seo?.title ?? note.title,
    description,
  };

  if (!frontmatter.slug) frontmatter.slug = toKebabCase(note.title);
  return frontmatter;
}
