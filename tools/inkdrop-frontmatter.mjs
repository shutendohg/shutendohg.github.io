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

/** A slug we are willing to put in a URL: lowercase ASCII words and hyphens. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Resolve the filename and URL slug for a note.
 *
 * Slugs stay English even though titles do not have to be. `toKebabCase` only
 * keeps ASCII words, so it is unusable for Japanese titles — it returns
 * undefined for 日本語のタイトル and "3" for 転職先に入社して3か月たった, which
 * would put every such post at undefined.md and have them overwrite each other.
 *
 * So a non-ASCII title has to declare `slug:` itself. Rather than invent a URL,
 * this returns a reason and the caller skips the note.
 *
 * @returns {{slug: string} | {slug: null, reason: string}}
 */
export function slugFor({ note, frontmatter }) {
  const declared = frontmatter?.slug;
  if (declared !== undefined && declared !== null && declared !== '') {
    return SLUG_PATTERN.test(String(declared))
      ? { slug: String(declared) }
      : {
          slug: null,
          reason: `slug "${declared}" is not a lowercase ASCII slug (a-z, 0-9 and hyphens)`,
        };
  }

  const title = note.title ?? '';
  const kebab = /^[\x20-\x7E]+$/.test(title) ? toKebabCase(title) : undefined;
  if (kebab && SLUG_PATTERN.test(kebab)) return { slug: kebab };

  return {
    slug: null,
    reason: 'no English slug could be derived from the title; add `slug:` to the note',
  };
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

  const { slug } = slugFor({ note, frontmatter });
  if (slug) frontmatter.slug = slug;
  return frontmatter;
}
