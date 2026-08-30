/* Pulls the live league state from ESPN and writes src/data/league.json.
   Runs in CI on a schedule and locally via `npm run sync`.
   Designed to be safe to run in the preseason (no games yet). */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  LEAGUE_ID, SEASON, leagueView, memberMap, teamName, teamLogo, teamInitials,
  POSITION, SLOT, STARTING_SLOTS, PRO_TEAM,
} from './lib/espn.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../src/data/league.json');
const OVERRIDES = resolve(__dirname, '../src/data/overrides.json');

function loadOverrides() {
  try { return JSON.parse(readFileSync(OVERRIDES, 'utf8')); }
  catch { return {}; }
}

function num(n, d = 1) { return typeof n === 'number' ? Number(n.toFixed(d)) : null; }

async function main() {
  const ov = loadOverrides();

  const data = await leagueView(
    ['mSettings', 'mTeam', 'mRoster', 'mMatchupScore', 'mStandings', 'mMembers', 'mDraftDetail', 'mTransactions2'],
  );

  const s = data.settings || {};
  const status = data.status || {};
  const members = memberMap(data.members || []);
  const scoring = s.scoringSettings || {};
  const sched = s.scheduleSettings || {};
  const draftS = s.draftSettings || {};

  const currentWeek = status.latestScoringPeriod || 0;
  const seasonStarted = currentWeek >= 1 && (status.currentMatchupPeriod || 0) >= 1 && !!(data.schedule || []).find(
    (g) => g.matchupPeriodId === 1 && (g.home?.totalPoints || g.away?.totalPoints),
  );

  /* --- teams --- */
  const teams = (data.teams || []).map((t) => {
    const o = t.record?.overall || {};
    const ownerSwid = (t.owners || [])[0];
    const ovT = ov.teams?.[t.id] || {};
    const entries = t.roster?.entries || [];
    const roster = entries.map((e) => {
      const p = e.playerPoolEntry?.player || {};
      return {
        name: p.fullName || 'Empty',
        pos: POSITION[p.defaultPositionId] || '?',
        proTeam: PRO_TEAM[p.proTeamId] ?? '',
        slot: SLOT[e.lineupSlotId] || String(e.lineupSlotId),
        starter: STARTING_SLOTS.has(e.lineupSlotId),
        injury: p.injuryStatus && p.injuryStatus !== 'ACTIVE' ? p.injuryStatus : null,
      };
    }).sort((a, b) => Number(b.starter) - Number(a.starter));

    return {
      id: t.id,
      name: teamName(t),
      abbrev: t.abbrev || teamName(t).slice(0, 4).toUpperCase(),
      initials: teamInitials(t),
      logo: teamLogo(t),
      owner: ovT.owner || members[ownerSwid] || 'Open seat',
      ownerHandle: ovT.ownerHandle || null,
      bio: ovT.bio || null,
      record: {
        wins: o.wins || 0,
        losses: o.losses || 0,
        ties: o.ties || 0,
        pointsFor: num(o.pointsFor, 1),
        pointsAgainst: num(o.pointsAgainst, 1),
        streakType: o.streakType || null,
        streakLength: o.streakLength || 0,
      },
      rank: t.playoffSeed || t.rankCalculatedFinal || null,
      roster,
    };
  }).sort((a, b) => a.id - b.id);

  const teamById = Object.fromEntries(teams.map((t) => [t.id, t]));

  /* --- schedule / weeks --- */
  const byWeek = new Map();
  for (const g of data.schedule || []) {
    const wk = g.matchupPeriodId;
    if (!wk) continue;
    if (!byWeek.has(wk)) byWeek.set(wk, []);
    const side = (x) => x && x.teamId ? {
      teamId: x.teamId,
      score: num(x.totalPoints, 2) ?? 0,
      // projected only present pre-lock; keep when available
    } : null;
    byWeek.get(wk).push({
      home: side(g.home),
      away: side(g.away),
      winner: g.winner && g.winner !== 'UNDECIDED' ? g.winner.toLowerCase() : null,
      playoff: g.playoffTierType && g.playoffTierType !== 'NONE' ? g.playoffTierType : null,
    });
  }
  const weeks = [...byWeek.entries()].sort((a, b) => a[0] - b[0]).map(([week, games]) => {
    const anyScore = games.some((m) => (m.home?.score || 0) + (m.away?.score || 0) > 0);
    const allDone = games.every((m) => m.winner);
    return {
      week,
      status: !anyScore ? 'upcoming' : allDone ? 'final' : 'live',
      isPlayoffs: week > (sched.matchupPeriodCount || 13),
      games,
    };
  });

  /* --- weekly awards: high & low scorer --- */
  const weeklyAwards = [];
  for (const w of weeks) {
    if (w.status === 'upcoming') continue;
    const scores = [];
    for (const g of w.games) {
      for (const sd of [g.home, g.away]) if (sd && sd.score != null) scores.push(sd);
    }
    if (scores.length < 2) continue;
    const high = scores.reduce((a, b) => (b.score > a.score ? b : a));
    const low = scores.reduce((a, b) => (b.score < a.score ? b : a));
    weeklyAwards.push({
      week: w.week,
      high: { teamId: high.teamId, score: high.score },
      low: { teamId: low.teamId, score: low.score },
    });
  }

  /* --- power rankings ---
     This league seeds playoffs on total points, so points carry real weight.
     Blend: 55% scoring rate, 30% win rate, 15% recent form (last 3 wks).      */
  let powerRankings = [];
  if (seasonStarted) {
    const played = Math.max(1, ...teams.map((t) => t.record.wins + t.record.losses + t.record.ties));
    const maxPF = Math.max(1, ...teams.map((t) => t.record.pointsFor || 0));
    const recent = recentForm(weeks, teamById);
    powerRankings = teams.map((t) => {
      const gp = t.record.wins + t.record.losses + t.record.ties || 1;
      const scoreRate = (t.record.pointsFor || 0) / gp;
      const winRate = (t.record.wins + t.record.ties * 0.5) / gp;
      const value =
        55 * (scoreRate / (maxPF / played)) +
        30 * winRate +
        15 * (recent[t.id] || 0);
      return { teamId: t.id, value: num(value, 1) };
    })
      .sort((a, b) => b.value - a.value)
      .map((r, i) => ({ rank: i + 1, ...r, note: ov.powerNotes?.[String(r.teamId)] || null }));
  }

  /* --- transactions --- */
  const transactions = (data.transactions || [])
    .filter((tx) => tx.status === 'EXECUTED')
    .map((tx) => ({
      id: tx.id,
      date: tx.proposedDate ? new Date(tx.proposedDate).toISOString() : null,
      type: tx.type,
      teamId: tx.teamId,
      bidAmount: tx.bidAmount || 0,
      items: (tx.items || []).map((it) => ({
        type: it.type, // ADD / DROP
        playerId: it.playerId,
        fromTeamId: it.fromTeamId || null,
        toTeamId: it.toTeamId || null,
      })),
    }))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 120);

  /* --- draft --- */
  const dd = data.draftDetail || {};
  const draft = {
    date: draftS.date ? new Date(draftS.date).toISOString() : null,
    type: draftS.type || 'SNAKE',
    secondsPerPick: draftS.timePerSelection || null,
    completed: !!dd.drafted,
    inProgress: !!dd.inProgress,
    order: (dd.picks || [])
      .filter((p) => p.roundId === 1)
      .sort((a, b) => a.roundPickNumber - b.roundPickNumber)
      .map((p) => p.teamId),
    picks: dd.drafted
      ? (dd.picks || []).map((p) => ({
          overall: p.overallPickNumber, round: p.roundId,
          teamId: p.teamId, playerId: p.playerId,
        }))
      : [],
  };

  const out = {
    generatedAt: new Date().toISOString(),
    season: SEASON,
    league: {
      id: LEAGUE_ID,
      name: (s.name || 'Armchair Quarterbacks').trim(),
      size: s.size || teams.length,
      scoring: scoring.scoringType === 'H2H_POINTS' ? 'H2H · PPR' : (scoring.scoringType || 'PPR'),
      regularSeasonWeeks: sched.matchupPeriodCount || 13,
      playoffTeamCount: sched.playoffTeamCount || 4,
      playoffSeedingRule: sched.playoffSeedingRule || 'TOTAL_POINTS_SCORED',
      currentWeek,
      seasonStarted,
      draft,
    },
    teams,
    weeks,
    awards: { weekly: weeklyAwards },
    powerRankings,
    transactions,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(
    `✓ league.json — ${teams.length} teams, ${weeks.length} weeks, ` +
    `week ${currentWeek}, seasonStarted=${seasonStarted}, ${transactions.length} txns`,
  );
}

function recentForm(weeks, teamById) {
  const done = weeks.filter((w) => w.status !== 'upcoming' && !w.isPlayoffs).slice(-3);
  const form = {};
  for (const w of done) {
    for (const g of w.games) {
      if (!g.home || !g.away) continue;
      const hw = g.home.score > g.away.score;
      form[g.home.teamId] = (form[g.home.teamId] || 0) + (hw ? 1 : 0);
      form[g.away.teamId] = (form[g.away.teamId] || 0) + (hw ? 0 : 1);
    }
  }
  const n = Math.max(1, done.length);
  for (const k of Object.keys(form)) form[k] /= n;
  return form;
}

main().catch((err) => {
  console.error('sync-espn failed:', err.message);
  if (!existsSync(OUT)) {
    console.error('No prior league.json exists — writing a minimal placeholder so the build still runs.');
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify({
      generatedAt: new Date().toISOString(), season: SEASON,
      league: { name: 'Armchair Quarterbacks', seasonStarted: false, currentWeek: 0, draft: {} },
      teams: [], weeks: [], awards: { weekly: [] }, powerRankings: [], transactions: [],
      error: err.message,
    }, null, 2) + '\n');
  }
  process.exitCode = 1;
});
