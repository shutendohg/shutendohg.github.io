import armoredKey from '@/assets/pgpkey.asc?raw';

// Serves the key at /pgpkey.asc from the same module the page renders, so the
// downloadable file and the block shown on /pgpkey are one source.
export function GET() {
  return new Response(armoredKey, {
    headers: { 'Content-Type': 'application/pgp-keys; charset=utf-8' },
  });
}
