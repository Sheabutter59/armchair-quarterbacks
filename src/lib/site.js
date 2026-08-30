import league from '../data/league.json';
import info from '../data/league-info.json';

export const TEAMS = league.teams || [];
export const LEAGUE = league.league || {};
export const teamById = (id) => TEAMS.find((t) => t.id === id) || null;

/** Nick Shea's team — used to highlight "your" row across the site. */
export const ME_TEAM_ID = 1;

export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function recordStr(rec) {
  if (!rec) return '0-0';
  return rec.ties ? `${rec.wins}-${rec.losses}-${rec.ties}` : `${rec.wins}-${rec.losses}`;
}

export function streakStr(rec) {
  if (!rec || !rec.streakLength) return '—';
  const t = rec.streakType === 'WIN' ? 'W' : rec.streakType === 'LOSS' ? 'L' : 'T';
  return `${t}${rec.streakLength}`;
}

const TZ = info.timezone || 'America/Chicago';

export function fmtDateTime(iso, opts = {}) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZone: TZ, ...opts,
  }) + ` ${info.timezoneLabel || ''}`.trimEnd();
}

export function fmtDate(iso, opts = {}) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: TZ, ...opts,
  });
}

export function relTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export function withBase(base, href) {
  const b = base.replace(/\/$/, '');
  return `${b}/${href}`.replace(/\/$/, '') || `${b}/`;
}

/** money helpers */
export const money = (n) => `$${n}`;
export const POT = (info.money.buyIn || 0) * (info.format.teams || 0);
