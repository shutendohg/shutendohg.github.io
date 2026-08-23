import assert from 'node:assert/strict';
import test from 'node:test';

import { dump } from 'js-yaml';

import { applyPostSchema, deriveDescription } from './inkdrop-frontmatter.mjs';

const note = (over = {}) => ({
  title: 'Hello World',
  createdAt: Date.UTC(2026, 7, 23, 5, 0, 0),
  ...over,
});

const mdast = (...children) => ({ type: 'root', children });
const paragraph = (value) => ({ type: 'paragraph', children: [{ type: 'text', value }] });

test('date is a Date, so js-yaml emits an unquoted timestamp', () => {
  const frontmatter = applyPostSchema({ note: note(), frontmatter: {}, mdast: mdast() });

  assert.ok(frontmatter.date instanceof Date);
  // A quoted string here would fail the collection's `z.date()`.
  assert.match(dump(frontmatter), /^date: 2026-08-23T05:00:00\.000Z$/m);
});

test('seo.title and seo.description are always present', () => {
  const frontmatter = applyPostSchema({
    note: note(),
    frontmatter: {},
    mdast: mdast(paragraph('An intro paragraph.')),
  });

  assert.equal(frontmatter.seo.title, 'Hello World');
  assert.equal(frontmatter.seo.description, 'An intro paragraph.');
});

test('an author-written seo block wins over the derived one', () => {
  const frontmatter = applyPostSchema({
    note: note(),
    frontmatter: { seo: { title: 'Custom', description: 'Written by hand' } },
    mdast: mdast(paragraph('Ignored.')),
  });

  assert.equal(frontmatter.seo.title, 'Custom');
  assert.equal(frontmatter.seo.description, 'Written by hand');
});

test('the description skips headings, code and images', () => {
  const description = deriveDescription(
    mdast(
      { type: 'heading', depth: 2, children: [{ type: 'text', value: 'Title' }] },
      { type: 'code', lang: 'js', value: 'const a = 1;' },
      {
        type: 'paragraph',
        children: [
          { type: 'image', url: 'x.png', alt: 'shot' },
          { type: 'text', value: 'Real prose.' },
        ],
      },
    ),
  );

  assert.equal(description, 'Real prose.');
});

test('a long description is cut on a word boundary', () => {
  const description = deriveDescription(mdast(paragraph('word '.repeat(60).trim())));

  assert.ok(description.length <= 161, description.length);
  assert.ok(description.endsWith('…'));
  assert.ok(!description.includes('wor…'));
});

test('an empty note yields an empty description rather than throwing', () => {
  assert.equal(deriveDescription(mdast()), '');
  assert.equal(deriveDescription(undefined), '');
});

test('the slug falls back to a kebab-cased title', () => {
  assert.equal(
    applyPostSchema({ note: note(), frontmatter: {}, mdast: mdast() }).slug,
    'hello-world',
  );
  assert.equal(
    applyPostSchema({ note: note(), frontmatter: { slug: 'kept' }, mdast: mdast() }).slug,
    'kept',
  );
});
