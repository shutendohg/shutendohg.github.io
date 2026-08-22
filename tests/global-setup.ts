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
  // Refuse to touch it instead.
  const status = execFileSync('npx', ['astro', 'preview', 'status'], {
    encoding: 'utf8',
  });
  if (!status.includes('No preview server is running')) {
    throw new Error(
      `A preview server is already running; stop it before running the tests.\n${status}`,
    );
  }

  execFileSync('npx', ['astro', 'preview', '--background', '--port', String(PORT)], {
    stdio: 'inherit',
  });
}
