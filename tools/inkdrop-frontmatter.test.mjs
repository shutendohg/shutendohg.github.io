import assert from 'node:assert/strict';
import test from 'node:test';

import { dump } from 'js-yaml';

import { applyPostSchema, deriveDescription, slugFor } from './inkdrop-frontmatter.mjs';

const note = (over = {}) => ({
  _id: 'note:C-v_rj9R',
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

test('a Japanese title without a declared slug is refused, not guessed', () => {
  // toKebabCase returns undefined here, which would write every such post to
  // undefined.md and have them overwrite each other.
  const { slug, reason } = slugFor({ note: note({ title: '日本語のタイトル' }), frontmatter: {} });

  assert.equal(slug, null);
  assert.match(reason, /slug:/);
});

test('a Japanese title containing digits does not become just the digits', () => {
  // toKebabCase('転職先に入社して3か月たった') is '3'.
  const { slug } = slugFor({
    note: note({ title: '転職先に入社して3か月たった' }),
    frontmatter: {},
  });

  assert.equal(slug, null);
});

test('a Japanese title publishes once it declares an English slug', () => {
  const { slug } = slugFor({
    note: note({ title: '耐量子計算機暗号に対応したBoringSSLをお試しする' }),
    frontmatter: { slug: 'post-quantum-boringssl' },
  });

  assert.equal(slug, 'post-quantum-boringssl');
});

test('a declared slug that is not an English slug is refused', () => {
  for (const bad of ['日本語', 'Bad_Slug', 'has spaces', '-leading', 'trailing-']) {
    const { slug, reason } = slugFor({ note: note(), frontmatter: { slug: bad } });
    assert.equal(slug, null, bad);
    assert.match(reason, /lowercase ASCII/);
  }
});

test('an ASCII title still produces a readable slug', () => {
  assert.equal(
    slugFor({ note: note({ title: 'Diary May in 2022' }), frontmatter: {} }).slug,
    'diary-may-in-2022',
  );
});

test('applyPostSchema leaves slug unset when none can be resolved', () => {
  const frontmatter = applyPostSchema({
    note: note({ title: '日本語のタイトル' }),
    frontmatter: {},
    mdast: mdast(),
  });

  assert.equal(frontmatter.slug, undefined);
});
