/** Single source of truth for site navigation. `href` values are base-relative
 *  (no leading slash) so they work under any deploy base path.
 *  `primary` items appear directly in the desktop header; everything shows in the
 *  full "Menu" sheet and (for `TABS`) the mobile bottom bar. */
export const SECTIONS = [
  { href: '',              label: 'Home',        short: 'Home',   icon: 'home',    primary: false },
  { href: 'scoreboard',    label: 'Scoreboard',  short: 'Scores', icon: 'score',   primary: true },
  { href: 'standings',     label: 'Standings',   short: 'Table',  icon: 'table',   primary: true },
  { href: 'board',         label: 'Chat Board',  short: 'Board',  icon: 'meme',    primary: true },
  { href: 'weddle',        label: 'Weddle',      short: 'Weddle', icon: 'star',    primary: true },
  { href: 'kick',          label: 'FG Kick',     short: 'Kick',   icon: 'bolt',    primary: true },
  { href: 'rankings',      label: 'Player Rankings', short: 'Ranks', icon: 'list', primary: false },
  { href: 'top-players',   label: 'Top Scorers', short: 'Top 10', icon: 'star',    primary: false },
  { href: 'power-rankings',label: 'Power Rankings', short: 'Power', icon: 'bolt',  primary: false },
  { href: 'matchups',      label: 'Matchups',    short: 'Games',  icon: 'vs',      primary: false },
  { href: 'rosters',       label: 'Rosters',     short: 'Rosters', icon: 'roster', primary: false },
  { href: 'transactions',  label: 'Transactions', short: 'Moves', icon: 'swap',    primary: false },
  { href: 'playoffs',      label: 'Playoffs',    short: 'Bracket', icon: 'bracket',primary: false },
  { href: 'awards',        label: 'Awards',      short: 'Awards', icon: 'star',     primary: false },
  { href: 'champions',     label: 'Champions',   short: 'History', icon: 'trophy', primary: false },
  { href: 'news',          label: 'NFL News',    short: 'News',   icon: 'news',    primary: false },
  { href: 'teams',         label: 'Teams & Owners', short: 'Teams', icon: 'people',primary: false },
  { href: 'payouts',       label: 'Payouts',     short: 'Money',  icon: 'cash',    primary: false },
  { href: 'rules',         label: 'Rules',       short: 'Rules',  icon: 'book',    primary: false },
  { href: 'memes',         label: 'Meme Wall',   short: 'Memes',  icon: 'meme',    primary: false },
];

export const PRIMARY = SECTIONS.filter((s) => s.primary);

/** the handful that get a spot on the mobile bottom tab bar */
export const TABS = ['', 'scoreboard', 'board', 'weddle', 'kick'];
