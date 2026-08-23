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
import { mkdirSync } from 'node:fs';

import { LiveExporter, toKebabCase } from '@inkdropapp/live-export';

import { applyPostSchema, slugFor } from './inkdrop-frontmatter.mjs';

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
  console.error('See docs/guides/publishing-from-inkdrop.md for how to set them.');
  process.exit(1);
}

const POSTS_PATH = './src/content/posts';
// Body images go to public/ because they are referenced by URL from the
// Markdown. This does not collide with the /writing routes.
const IMAGES_PATH = './public/posts';

// The library writes with fs.writeFileSync and never creates directories, so a
// note with an image would otherwise crash the watcher with ENOENT on a fresh
// clone. src/content/posts happens to exist, which hides this until an image
// shows up.
mkdirSync(POSTS_PATH, { recursive: true });
mkdirSync(IMAGES_PATH, { recursive: true });

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
  pathForNote: ({ note, frontmatter }) => {
    if (!frontmatter.public) return false;
    // Titles may be Japanese, but slugs stay English, so a note whose title has
    // no usable ASCII form must declare one. Skipping is deliberate: guessing a
    // path here is how posts end up overwriting each other.
    const { slug, reason } = slugFor({ note, frontmatter });
    if (!slug) {
      console.warn(`Skipping "${note.title}": ${reason}`);
      return false;
    }
    return `${POSTS_PATH}/${slug}.md`;
  },
  urlForNote: ({ note, frontmatter }) => {
    if (!frontmatter.public) return false;
    const { slug } = slugFor({ note, frontmatter });
    // src/pages/writing/[...slug].astro serves the posts collection.
    return slug ? `/writing/${slug}` : false;
  },
  pathForFile: ({ mdastNode, file, extension, frontmatter }) => {
    // Always return a path. Returning false leaves the inkdrop:// URL in the
    // Markdown, which builds fine and then shows a broken image on the live
    // page — and deletes the already-exported file on a later edit.
    const fileId = String(file._id ?? '').replace(/^file:/, '');
    const alt = mdastNode.alt ? toKebabCase(mdastNode.alt) : undefined;
    // The id keeps two images with the same alt text in one post from
    // overwriting each other.
    const filename = `${frontmatter.slug}_${alt ? `${alt}_` : ''}${fileId}${extension}`;
    return {
      filePath: `${IMAGES_PATH}/${filename}`,
      url: `/posts/${filename}`,
    };
  },
});

console.log('Watching Inkdrop for changes. Press Ctrl+C to stop.');
