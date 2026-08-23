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
2. Create `.env` in the repository root with the four variables below. It is
   git-ignored and never leaves your machine — the export runs locally, so no
   credentials are needed by CI or the deployment.

   ```sh
   INKDROP_USERNAME=
   INKDROP_PASSWORD=
   INKDROP_PORT=19840
   INKDROP_BOOKID=book:xxxxxxxx
   ```

   `INKDROP_BOOKID` is the notebook to export. List the ids from the local
   server:

   ```sh
   curl -su USER:PASS http://127.0.0.1:19840/books | jq -r '.[] | "\(._id)\t\(.name)"'
   ```

   Running the exporter without these prints the names it is missing, so there
   is no template file to keep in sync.

## Writing a post

```sh
npm run live-import
```

This watches the notebook and rewrites files as notes change. Leave it running
while you write.

**A note is only exported if its frontmatter contains `public: true`.** A note
with no frontmatter at all was never meant to be a post, so it is skipped
silently.

Titles can be Japanese, but slugs stay English, and one cannot be derived from
a Japanese title — so those notes have to declare `slug:` themselves. A note
marked `public: true` without a usable slug is skipped with a message saying so,
rather than being published at a guessed URL.

```markdown
---
public: true
slug: post-quantum-boringssl
---

The first paragraph becomes the SEO description.
```

A slug must be lowercase ASCII words joined by hyphens (`a-z`, `0-9`, `-`).
`slug:` is optional when the title is already English; it is required otherwise.

To unpublish, remove `public: true` **and delete the exported file**. The
exporter only deletes files it wrote earlier in the same session — it tracks
them in memory, so a watcher started later will leave the old file in place.

The exporter fills in the rest of what the `posts` collection requires:

| Field | Where it comes from |
| :--- | :--- |
| `title` | The note title |
| `date` | The note's creation time, as a YAML timestamp |
| `seo.title` | The note title, unless you set one yourself |
| `seo.description` | The first prose paragraph, unless you set one yourself |
| `slug` | A kebab-cased title when it is English; otherwise you must set it |

Body images are written to `public/posts/`, named after the post slug and the
image's own id so that two images sharing alt text cannot overwrite each other.
The hero `image` field is not set by the exporter: the collection types it with Astro's
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
