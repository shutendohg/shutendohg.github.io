import { execFileSync } from 'node:child_process';

export default function globalTeardown() {
  execFileSync('npx', ['astro', 'preview', 'stop'], { stdio: 'inherit' });
}
