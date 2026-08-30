/* Rebuilds src/data/memes.json from whatever image files live in public/memes/.
   Keeps any hand-written captions you've already added (matched by filename).
   Run: npm run memes   (also wired into `npm run refresh`) */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = resolve(__dirname, '../public/memes');
const OUT = resolve(__dirname, '../src/data/memes.json');

const IMG = /\.(webp|png|jpe?g|gif)$/i;

function titleFromName(file) {
  const base = file.replace(IMG, '')
    .replace(/-v\d+-[a-z0-9]+$/i, '')   // strip reddit "-v0-<id>" suffix
    .trim();
  // a real caption slug has dashes between words; a bare id like "t9nxb95vtxn81" does not
  if (!base || (!base.includes('-') && /\d/.test(base))) return null;
  const words = base.split('-').filter(Boolean);
  if (words.length < 2) return null;
  return words.join(' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

let prev = {};
try {
  const old = JSON.parse(readFileSync(OUT, 'utf8'));
  for (const m of old.memes || []) prev[m.src] = m;
} catch { /* first run */ }

const GENERIC = 'Certified group-chat material';
const files = readdirSync(DIR).filter((f) => IMG.test(f)).sort();
let n = 0;
const memes = files.map((file) => {
  const src = `/memes/${file}`;
  const title = titleFromName(file);
  const prevCap = prev[src]?.caption;
  // treat a previous caption as hand-written only if it isn't the auto value
  const handWritten = prevCap && prevCap !== GENERIC && prevCap !== title ? prevCap : null;
  return {
    id: ++n,
    src,
    caption: handWritten ?? title ?? GENERIC,
    alt: prev[src]?.alt && prev[src].alt !== title ? prev[src].alt : (title ?? 'League meme'),
  };
});

writeFileSync(OUT, JSON.stringify({
  _comment: 'Meme wall + rotating Meme of the Week. Add images to public/memes/ then run `npm run memes`. Edit `caption` freely — it is preserved across rebuilds.',
  memes,
}, null, 2) + '\n');

console.log(`✓ memes.json — ${memes.length} memes`);
