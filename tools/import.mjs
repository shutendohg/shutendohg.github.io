/**
 * Live-export notes from Inkdrop into the `posts` content collection.
 *
 * Run with `npm run live-import`, which loads credentials from .env via Node's
 * built-in --env-file. Requires Inkdrop's local HTTP server to be enabled
 * (Preferences -> Server).
 *
 * Only notes whose frontmatter contains `public: true` are exported; anything
 * else is skipped, so drafts stay in Inkdrop.
 */
import { LiveExporter, toKebabCase } from '@inkdropapp/live-export';

import { applyPostSchema } from './inkdrop-frontmatter.mjs';

const { INKDROP_USERNAME, INKDROP_PASSWORD, INKDROP_PORT, INKDROP_BOOKID } =
  process.env;

const missing = Object.entries({
  INKDROP_USERNAME,
  INKDROP_PASSWORD,
  INKDROP_PORT,
  INKDROP_BOOKID,
})
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missing.length > 0) {
  // Without this the exporter fails much later with an opaque auth error.
  console.error(`Missing environment variables: ${missing.join(', ')}`);
  console.error('Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const POSTS_PATH = './src/content/posts';
// Body images go to public/ because they are referenced by URL from the
// Markdown. This does not collide with the /writing routes.
const IMAGES_PATH = './public/posts';

const liveExport = new LiveExporter({
  username: INKDROP_USERNAME,
  password: INKDROP_PASSWORD,
  port: Number(INKDROP_PORT),
});

await liveExport.start({
  live: true,
  bookId: INKDROP_BOOKID,
  preProcessNote: ({ note, frontmatter, mdast }) =>
    applyPostSchema({ note, frontmatter, mdast }),
  pathForNote: ({ frontmatter }) =>
    frontmatter.public ? `${POSTS_PATH}/${frontmatter.slug}.md` : false,
  urlForNote: ({ note, frontmatter }) => {
    if (!frontmatter.public) return false;
    if (!frontmatter.slug) frontmatter.slug = toKebabCase(note.title);
    // src/pages/writing/[...slug].astro serves the posts collection.
    return `/writing/${frontmatter.slug}`;
  },
  pathForFile: ({ mdastNode, extension, frontmatter }) => {
    if (!mdastNode.alt) return false;
    const filename = `${frontmatter.slug}_${toKebabCase(mdastNode.alt)}${extension}`;
    return {
      filePath: `${IMAGES_PATH}/${filename}`,
      url: `/posts/${filename}`,
    };
  },
});

console.log('Watching Inkdrop for changes. Press Ctrl+C to stop.');
