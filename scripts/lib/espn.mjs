/* Shared ESPN Fantasy API helpers.
   The league is public, so no auth cookies are needed for the CURRENT season.
   Docs are unofficial; endpoints occasionally shift. Everything here fails soft. */

export const LEAGUE_ID = process.env.ESPN_LEAGUE_ID || '1670450262';
export const SEASON = Number(process.env.ESPN_SEASON) || new Date().getFullYear();

const READ_HOST = 'https://lm-api-reads.fantasy.espn.com';
const BASE = `${READ_HOST}/apis/v3/games/ffl`;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; ArmchairQuarterbacksBot/1.0)',
  Accept: 'application/json',
};

/** GET a league view (or several). Returns parsed JSON or throws with context. */
export async function leagueView(views = [], { season = SEASON, extra = {} } = {}) {
  const params = new URLSearchParams();
  for (const v of views) params.append('view', v);
  for (const [k, val] of Object.entries(extra)) params.append(k, val);
  const url = `${BASE}/seasons/${season}/segments/0/leagues/${LEAGUE_ID}?${params}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`ESPN ${res.status} for [${views.join(',')}] — ${body.slice(0, 160)}`);
  }
  return res.json();
}

/** Season-level player universe (public regardless of league privacy). */
export async function playerPool({ season = SEASON, limit = 900, filter } = {}) {
  const url = `${BASE}/seasons/${season}/players?scoringPeriodId=0&view=players_wl`;
  const headers = { ...HEADERS };
  if (filter) headers['x-fantasy-filter'] = JSON.stringify(filter);
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`ESPN players ${res.status}`);
  const all = await res.json();
  return all.slice(0, limit);
}

/** kona_player_info carries projections + positional ranks. */
export async function playerInfo({ season = SEASON, scoringPeriodId = 0, filter } = {}) {
  const url = `${BASE}/seasons/${season}/segments/0/leagues/${LEAGUE_ID}?view=kona_player_info`;
  const res = await fetch(url, {
    headers: { ...HEADERS, 'x-fantasy-filter': JSON.stringify(filter || defaultPlayerFilter(scoringPeriodId)) },
  });
  if (!res.ok) throw new Error(`ESPN kona_player_info ${res.status}`);
  const j = await res.json();
  return j.players || [];
}

export function defaultPlayerFilter(scoringPeriodId = 0) {
  return {
    players: {
      filterStatsForTopScoringPeriodIds: { value: 16 },
      sortDraftRanks: { sortPriority: 100, sortAsc: true, value: 'PPR' },
      limit: 400,
      offset: 0,
      filterRanksForScoringPeriodIds: { value: [scoringPeriodId] },
      filterRanksForRankTypes: { value: ['PPR'] },
    },
  };
}

/* --- id maps --- */

export const POSITION = { 1: 'QB', 2: 'RB', 3: 'WR', 4: 'TE', 5: 'K', 16: 'D/ST' };

// ESPN lineupSlotId -> label
export const SLOT = {
  0: 'QB', 1: 'TQB', 2: 'RB', 3: 'RB/WR', 4: 'WR', 5: 'WR/TE', 6: 'TE',
  7: 'OP', 16: 'D/ST', 17: 'K', 18: 'P', 19: 'HC', 20: 'BE', 21: 'IR',
  23: 'FLEX', 24: 'ER',
};
export const STARTING_SLOTS = new Set([0, 2, 4, 6, 16, 17, 23, 3, 5, 7]);

export const PRO_TEAM = {
  0: 'FA', 1: 'ATL', 2: 'BUF', 3: 'CHI', 4: 'CIN', 5: 'CLE', 6: 'DAL', 7: 'DEN',
  8: 'DET', 9: 'GB', 10: 'TEN', 11: 'IND', 12: 'KC', 13: 'LV', 14: 'LAR', 15: 'MIA',
  16: 'MIN', 17: 'NE', 18: 'NO', 19: 'NYG', 20: 'NYJ', 21: 'PHI', 22: 'ARI',
  23: 'PIT', 24: 'LAC', 25: 'SF', 26: 'SEA', 27: 'TB', 28: 'WSH', 29: 'CAR',
  30: 'JAX', 33: 'BAL', 34: 'HOU',
};

// ESPN transaction type -> readable
export const TXN_TYPE = {
  WAIVER: 'Waiver claim', FREEAGENT: 'Free agent', TRADE_ACCEPT: 'Trade',
  DRAFT: 'Draft', ROSTER: 'Roster move',
};

/** Map ESPN member records to { swid -> "Display Name" } using real name when present. */
export function memberMap(members = []) {
  const m = {};
  for (const mem of members) {
    const real = [mem.firstName, mem.lastName].filter(Boolean).join(' ').trim();
    m[mem.id] = real || mem.displayName || 'Unknown Manager';
  }
  return m;
}

export function teamName(t) {
  return (t.name || `${t.location || ''} ${t.nickname || ''}`.trim() || `Team ${t.id}`).trim();
}

export function teamLogo(t) {
  const l = t.logo || '';
  // Only the public logo-pack CDN is usable without auth. Custom uploads live on
  // mystique-api.fantasy.espn.com and require the manager's ESPN cookies (401),
  // so we fall back to pixel initials for those.
  if (!l || !/g\.espncdn\.com|a\.espncdn\.com/i.test(l)) return null;
  if (/blank|default/i.test(l)) return null;
  return l;
}

/** 2–3 char crest text: use the abbrev if it's alphanumeric, else initials from the name. */
export function teamInitials(t) {
  const ab = (t.abbrev || '').replace(/[^A-Za-z0-9]/g, '');
  if (ab.length >= 2) return ab.slice(0, 3).toUpperCase();
  const name = teamName(t);
  const words = name.replace(/[^A-Za-z0-9 ]/g, '').split(/\s+/).filter(Boolean);
  if (words.length >= 2) return words.slice(0, 3).map((w) => w[0]).join('').toUpperCase();
  return (name.replace(/[^A-Za-z0-9]/g, '') || 'AQ').slice(0, 3).toUpperCase();
}
