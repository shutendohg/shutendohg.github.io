# Publishing from Inkdrop

Posts under `/writing` are written in [Inkdrop](https://www.inkdrop.app/) and
exported into `src/content/posts/` by
[`@inkdropapp/live-export`](https://github.com/inkdropapp/inkdrop-live-export).
Everything else on the site — the homepage text, the contact links, the jobs and
talks lists — is still edited directly in `src/content/`.

## One-time setup

1. In Inkdrop, open Preferences → Server and enable the local HTTP server. Note
   the username and password shown there; they are specific to that server and
   are not your Inkdrop account credentials.
2. Copy `.env.example` to `.env` and fill it in. `.env` is git-ignored and never
   leaves your machine — the export runs locally, so no credentials are needed
   by CI or the deployment.

   ```sh
   cp .env.example .env
   ```

   `INKDROP_BOOKID` is the notebook to export. Notebook ids look like
   `book:xxxxxxxx` and can be listed from the local server's `/books` endpoint.

## Writing a post

```sh
npm run live-import
```

This watches the notebook and rewrites files as notes change. Leave it running
while you write.

**A note is only exported if its frontmatter contains `public: true`.** Drafts
without it stay in Inkdrop:

```markdown
---
public: true
---

The first paragraph becomes the SEO description.
```

Removing `public: true` again deletes the exported file, so unpublishing a post
is the same edit in reverse.

The exporter fills in the rest of what the `posts` collection requires:

| Field | Where it comes from |
| :--- | :--- |
| `title` | The note title |
| `date` | The note's creation time, as a YAML timestamp |
| `seo.title` | The note title, unless you set one yourself |
| `seo.description` | The first prose paragraph, unless you set one yourself |
| `slug` | A kebab-cased title, unless you set one yourself |

Body images are written to `public/posts/` and referenced by URL. The hero
`image` field is not set by the exporter: the collection types it with Astro's
`image()` helper, which expects a path relative to the Markdown file rather than
a public URL. Set it by hand if a post needs one.

## Publishing

The export writes files; it does not publish. Review what changed, then commit
and push as usual — CI builds and smoke-tests the pull request, and merging to
`main` deploys.

```sh
git status
git add src/content/posts public/posts
git commit
```
