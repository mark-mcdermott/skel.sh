<h1>
  <img src="./src/assets/mascot.png" width="25" valign="middle">
  skel.sh
</h1>

The landing page for [skel](https://github.com/mark-mcdermott/skel) — a small bash
utility that scaffolds files and directories from an indented tree.

Live at **[skel.sh](https://skel.sh)**.

## Stack

Astro 7 · Tailwind 4 · deployed on Vercel. No framework islands — the page ships
a few hundred bytes of JavaScript for the copy buttons and nothing else.

## Develop

```bash
pnpm install
pnpm dev
```

| Command | Does |
| --- | --- |
| `pnpm dev` | Dev server on :4321 |
| `pnpm build` | Static build to `dist/` |
| `pnpm preview` | Serve the built output |
| `pnpm check` | Astro + TypeScript diagnostics |
| `pnpm test` | Build, then Playwright |
| `pnpm sync` | Refresh `src/data/cli.json` from skel's latest release |
| `pnpm bless` | Re-approve upstream wording after updating the page copy |

## Where the content comes from

The version, install steps and ruleset are **generated**, not written here:

```bash
pnpm sync
```

That reads the `mark-mcdermott/skel` repo at its latest **release** tag and writes
`src/data/cli.json`, which is committed. Builds read the committed file, so a
deploy never depends on GitHub being reachable — the worst case is that the site
is one release behind, which the nightly cron in `.github/workflows/sync.yml`
catches. If skel's README changes shape, `pnpm sync` throws instead of emitting a
half-empty page.

> This replaced a build-time fetch that fell back to a hardcoded version whenever
> GitHub couldn't be reached. That failure was silent: the page could show a
> confidently wrong version indefinitely. Don't reintroduce a fallback — being a
> release behind is recoverable, being wrong is not. The `GITHUB_TOKEN` that used
> to be needed in the Vercel project is now unused and can be removed.

### Why there are two data files

The page **paraphrases** skel's install steps and ruleset. Upstream's eight raw
bullets and four-line install blocks read badly on a landing page, so the copy is
a deliberate rewrite — `cd skel && ./install.sh` for two upstream lines, six
punchy rules for eight bullets. Rendering the README verbatim would make the page
worse.

A rewrite can quietly stop being true, so:

- `src/data/cli.json` — synced from upstream, changes on its own
- `src/data/reviewed.json` — the upstream wording as last reviewed by a human,
  changed only by `pnpm bless`

A test asserts the two agree. When skel changes a rule or an install step, CI
fails with a readable diff — you update the wording on the page, then `pnpm bless`
to re-approve. The sync workflow runs that guard *before* it commits, so a drifted
page is never deployed.

Only the version is rendered from synced data directly. Everything else on the
page, the demo tree especially, is editorial and should stay that way.

## How a release reaches the site

`make release` in the skel repo publishes a GitHub Release, which fires a
`repository_dispatch` here; `sync.yml` re-syncs, guards, and pushes; Vercel
deploys on the push. A nightly cron is the backstop.

This replaced a Vercel deploy hook that only fired from the one machine holding
`SKEL_SH_DEPLOY_HOOK`, so a release published any other way left the site stale.

## Assets

The mascot and the walkthrough recording are sourced from `skel-proj/branding/`
and `skel-proj/vids/`. The page uses the `.mp4` rather than the `.gif` — same
footage, a fifth of the bytes.
