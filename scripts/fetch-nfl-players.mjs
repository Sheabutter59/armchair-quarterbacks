/* Pulls every active NFL roster from ESPN's public site API and writes
   src/data/nfl-players.json — the answer key + guess pool for the Weddle game
   and a general player reference. No auth needed.
   Run: npm run players   (part of `npm run refresh`) */

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../src/data/nfl-players.json');
const PUBLIC_OUT = resolve(__dirname, '../public/weddle-players.json');

/** Names that appear in the fantasy rankings — the "known" players for Classic mode. */
function notableNames() {
  try {
    const r = JSON.parse(readFileSync(resolve(__dirname, '../src/data/rankings.json'), 'utf8'));
    const set = new Set();
    for (const pos of Object.values(r.positions || {})) for (const p of pos) set.add(p.name);
    return set;
  } catch { return new Set(); }
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  Referer: 'https://www.espn.com/',
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ESPN NFL team id -> { abbr, conf, div }
const TEAMS = {
  1:  { abbr: 'ATL', conf: 'NFC', div: 'South' },
  2:  { abbr: 'BUF', conf: 'AFC', div: 'East' },
  3:  { abbr: 'CHI', conf: 'NFC', div: 'North' },
  4:  { abbr: 'CIN', conf: 'AFC', div: 'North' },
  5:  { abbr: 'CLE', conf: 'AFC', div: 'North' },
  6:  { abbr: 'DAL', conf: 'NFC', div: 'East' },
  7:  { abbr: 'DEN', conf: 'AFC', div: 'West' },
  8:  { abbr: 'DET', conf: 'NFC', div: 'North' },
  9:  { abbr: 'GB',  conf: 'NFC', div: 'North' },
  10: { abbr: 'TEN', conf: 'AFC', div: 'South' },
  11: { abbr: 'IND', conf: 'AFC', div: 'South' },
  12: { abbr: 'KC',  conf: 'AFC', div: 'West' },
  13: { abbr: 'LV',  conf: 'AFC', div: 'West' },
  14: { abbr: 'LAR', conf: 'NFC', div: 'West' },
  15: { abbr: 'MIA', conf: 'AFC', div: 'East' },
  16: { abbr: 'MIN', conf: 'NFC', div: 'North' },
  17: { abbr: 'NE',  conf: 'AFC', div: 'East' },
  18: { abbr: 'NO',  conf: 'NFC', div: 'South' },
  19: { abbr: 'NYG', conf: 'NFC', div: 'East' },
  20: { abbr: 'NYJ', conf: 'AFC', div: 'East' },
  21: { abbr: 'PHI', conf: 'NFC', div: 'East' },
  22: { abbr: 'ARI', conf: 'NFC', div: 'West' },
  23: { abbr: 'PIT', conf: 'AFC', div: 'North' },
  24: { abbr: 'LAC', conf: 'AFC', div: 'West' },
  25: { abbr: 'SF',  conf: 'NFC', div: 'West' },
  26: { abbr: 'SEA', conf: 'NFC', div: 'West' },
  27: { abbr: 'TB',  conf: 'NFC', div: 'South' },
  28: { abbr: 'WSH', conf: 'NFC', div: 'East' },
  29: { abbr: 'CAR', conf: 'NFC', div: 'South' },
  30: { abbr: 'JAX', conf: 'AFC', div: 'South' },
  33: { abbr: 'BAL', conf: 'AFC', div: 'North' },
  34: { abbr: 'HOU', conf: 'AFC', div: 'South' },
};

// Weddle uses offensive skill players
const KEEP = new Set(['QB', 'RB', 'WR', 'TE', 'K', 'FB']);
const SKILL = KEEP;

async function fetchTeam(id, meta, tries = 3) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${id}/roster`;
  let res;
  for (let i = 0; i < tries; i++) {
    res = await fetch(url, { headers: HEADERS });
    if (res.ok) break;
    await sleep(800 * (i + 1));
  }
  if (!res.ok) throw new Error(`roster ${id}: ${res.status}`);
  const j = await res.json();
  const out = [];
  for (const group of j.athletes || []) {
    if (group.position === 'injuredReserveOrOut' || group.position === 'practiceSquad' || group.position === 'suspended') continue;
    for (const p of group.items || []) {
      const pos = p.position?.abbreviation;
      if (!pos || !KEEP.has(pos)) continue;
      if (!p.height || !p.weight || !p.age) continue;
      out.push({
        name: p.fullName,
        team: meta.abbr,
        conf: meta.conf,
        div: meta.div,
        pos,
        skill: SKILL.has(pos),
        num: p.jersey ? Number(p.jersey) : null,
        heightIn: p.height,
        heightStr: p.displayHeight || '',
        weight: p.weight,
        age: p.age,
        exp: p.experience?.years ?? 0,
        college: p.college?.name || '—',
      });
    }
  }
  return out;
}

async function main() {
  const entries = Object.entries(TEAMS);
  const results = [];
  // serial with a small delay — ESPN's site API rate-limits bursts hard
  for (const [id, meta] of entries) {
    try {
      results.push(...(await fetchTeam(id, meta)));
    } catch (e) {
      console.warn('  !', e.message);
    }
    await sleep(250);
  }

  // de-dupe by name+team
  const seen = new Set();
  const notable = notableNames();
  const players = results.filter((p) => {
    const k = `${p.name}|${p.team}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  })
    .map((p) => ({ ...p, notable: p.skill && (notable.has(p.name) || p.pos === 'QB') }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const out = {
    _comment: 'Auto-generated by scripts/fetch-nfl-players.mjs from ESPN. Powers the Weddle game. `notable` = Classic-mode answer pool.',
    generatedAt: new Date().toISOString(),
    count: players.length,
    skillCount: players.filter((p) => p.skill).length,
    notableCount: players.filter((p) => p.notable).length,
    players,
  };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out) + '\n');

  // compact copy the Weddle page fetches at runtime (short keys)
  const compact = {
    generatedAt: out.generatedAt,
    p: players.map((p) => [
      p.name, p.team, p.conf, p.div, p.pos, p.num ?? 0,
      p.heightIn, p.weight, p.age, p.exp, p.college, p.notable ? 1 : 0,
    ]),
  };
  mkdirSync(dirname(PUBLIC_OUT), { recursive: true });
  writeFileSync(PUBLIC_OUT, JSON.stringify(compact) + '\n');

  console.log(`✓ nfl-players.json — ${players.length} players (${out.notableCount} notable) + public/weddle-players.json`);
}

main().catch((e) => { console.error('fetch-nfl-players failed:', e.message); process.exitCode = 1; });
