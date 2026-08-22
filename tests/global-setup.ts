import { execFileSync } from 'node:child_process';

/** Serve the built `dist/` for the duration of the run. */
export default function globalSetup() {
  execFileSync('npx', ['astro', 'preview', '--port', '4321'], { stdio: 'inherit' });
}
