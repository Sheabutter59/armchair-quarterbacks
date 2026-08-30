# Armchair Quarterbacks

The league site for the **Armchair Quarterbacks** fantasy football league — a bold-poster take on
Sleeper. Standings, scoreboard, power rankings, tiered player rankings, an NFL news feed, the meme
wall, the record of champions and last-place finishers — plus a daily **Weddle** game, a
**field-goal kicking** game, a shared **chat board**, and a weekly **top-10 scorers** board.

Built with [Astro](https://astro.build). Static site, no server. League + NFL data is pulled from
ESPN's public API on a schedule; everything else lives in small JSON files you can hand-edit.

---

## One-time setup (deploy)

You need a GitHub account. ~15 minutes.

1. **Create an empty repo** on GitHub named `armchair-quarterbacks`. **Make it public**
   (the chat board and meme submissions need it). If you pick another name, the site just lives
   at `…github.io/<that-name>/`.

2. **Push this folder to it:**
   ```bash
   git init
   git add .
   git commit -m "Armchair Quarterbacks site"
   git branch -M main
   git remote add origin https://github.com/<your-username>/armchair-quarterbacks.git
   git push -u origin main
   ```

3. **Turn on Pages:** repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**.

4. **Set your repo** in `src/data/league-info.json` → `repo` field
   (`"your-username/armchair-quarterbacks"`), commit. This turns on the meme submission bin.

5. **Chat board** (optional, ~3 min) — see [Chat board setup](#chat-board-setup) below.

6. That's it. The **Deploy site** action runs automatically and your site goes live at
   `https://<your-username>.github.io/armchair-quarterbacks/`
   (find the exact URL in the Actions run summary or the Pages settings screen).

7. **Check the data refresh works:** repo → **Actions → Refresh data → Run workflow**. This pulls
   the latest from ESPN + NFL news, commits the changes, and redeploys.

### Keeping it fresh automatically

The **Refresh data** workflow runs on a schedule:

| What | When |
|---|---|
| NFL news | every 4 hours |
| Top-10 fantasy scorers | Monday, Tuesday, Friday mornings (US) |
| League sync + rankings + NFL player DB (Weddle) | Tuesday & Wednesday mornings |

Each run commits any changed data files, which triggers a redeploy. Nothing for you to do.

---

## Chat board setup

The board (`/board`) uses [giscus](https://giscus.app) — a free chat widget backed by GitHub
Discussions. No server, no cost. Until it's configured the page shows these same steps.

1. Repo → **Settings → General → Features** → tick **Discussions**.
2. Open the **Discussions** tab → **New category** → name it `Board`.
3. Go to [giscus.app](https://giscus.app), enter `your-username/armchair-quarterbacks`, choose the
   **Board** category. It shows you a `data-repo-id` and `data-category-id`.
4. Put both into `src/data/league-info.json` → `giscus` block (`repo`, `repoId`, `categoryId`),
   commit. The board goes live.

---

## Editing content

Everything you'd want to change by hand is in `src/data/`:

| File | What it holds |
|---|---|
| `league-info.json` | Buy-in, payouts, penalties, rules, timezone, kickoff date, **`repo`** (meme bin), **`giscus`** (chat board) |
| `history.json` | Past champions, runners-up, last place, and the all-time record book |
| `overrides.json` | Manager handles, optional team bios, power-ranking notes |
| `memes.json` | Captions for the meme wall (auto-generated; edit captions freely) |

The rest are machine-generated — don't hand-edit, they get overwritten:
`league.json` (ESPN sync), `rankings.json` (ESPN projections), `news.json` (RSS),
`nfl-players.json` + `public/weddle-players.json` (Weddle DB), `top-players.json` (weekly scorers).

### Add memes

Drop image files (`.webp`, `.png`, `.jpg`, `.gif`) into `public/memes/` and commit. On the next
deploy they appear on the wall. To caption one, edit its `caption` in `src/data/memes.json` —
your captions survive future rebuilds.

### The season starts

Nothing to do. Once ESPN has real games, the scheduled sync fills in standings, scores, rosters,
transactions, the playoff bracket, power rankings, and the weekly Winner/Loser awards. The
homepage automatically swaps the draft countdown for the live week.

---

## Local development

Requires Node 18+.

```bash
npm install
npm run dev          # http://localhost:4321

npm run sync         # league state from ESPN         -> src/data/league.json
npm run news         # NFL headlines                  -> src/data/news.json
npm run rankings     # PPR projections                -> src/data/rankings.json
npm run players      # NFL player DB for Weddle       -> src/data/nfl-players.json + public/
npm run topplayers   # week's top-10 fantasy scorers  -> src/data/top-players.json
npm run memes        # rebuild the meme manifest      -> src/data/memes.json
npm run refresh      # all of the above

npm run build        # static build -> dist/
```

---

## Notes

- **League ID** is `1670450262`, set in `scripts/lib/espn.mjs` (override with the
  `ESPN_LEAGUE_ID` env var). The league must stay **publicly viewable** in ESPN for the sync to
  work (League Settings → make league viewable to public).
- **Deploy target** is configurable via `SITE_URL` and `BASE_PATH` env vars (see
  `astro.config.mjs`). The GitHub Pages workflow sets these for you. For a custom domain or
  Netlify, set `BASE_PATH=/`.
- Not affiliated with ESPN, the NFL, or Tecmo. Player data via ESPN's public endpoints.
