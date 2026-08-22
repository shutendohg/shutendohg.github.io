import { execFileSync } from 'node:child_process';

import { PORT } from '../playwright.config';

/**
 * Serve the built `dist/` for the duration of the run.
 *
 * `--background` is required: without it `astro preview` runs in the
 * foreground and never returns, so global setup would hang. (It does
 * self-background when it detects an AI agent session, which makes the
 * foreground form appear to work when an agent runs it — but not in CI.)
 */
export default function globalSetup() {
  // `astro preview` exits 0 and quietly reuses an already-running server, and
  // `astro preview stop` would then kill a server this run did not start.
  // Refuse to run instead.
  const status = execFileSync('npx', ['astro', 'preview', 'status'], {
    encoding: 'utf8',
  });
  if (!status.includes('No preview server is running')) {
    throw new Error(
      `A preview server is already running; stop it before running the tests.\n${status}`,
    );
  }

  const started = execFileSync(
    'npx',
    ['astro', 'preview', '--background', '--port', String(PORT)],
    { encoding: 'utf8' },
  );
  process.stdout.write(started);

  // Astro forwards to `vite preview` without `strictPort`, so a taken port is
  // silently incremented. `astro dev` also defaults to 4321, so without this
  // check a contributor with the dev server running would have the whole suite
  // pass against the dev server instead of the built output.
  if (!started.includes(`localhost:${PORT}`)) {
    throw new Error(
      `The preview server did not bind port ${PORT}; something else is using it.\n${started}`,
    );
  }
}
