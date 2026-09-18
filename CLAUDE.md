# skel.sh

Landing page for [skel](https://github.com/mark-mcdermott/skel), the bash tree-scaffolding
CLI. Astro 7 · Tailwind v4 · static · Vercel. Same pattern as `puravida.sh`.

## Content that must stay true to the CLI

```bash
pnpm sync    # scripts/sync-cli.mjs -> src/data/cli.json (committed)
```

Reads the skel repo at its **latest release tag** and captures `VERSION` from `skel.sh`,
the install methods, and the ruleset. The committed JSON is what builds read, so a network
failure can never break a deploy — it can only leave the site a release behind, which the
daily cron catches. If the README's `## Install` or `## Rules` structure changes, `pnpm sync`
throws rather than emitting an empty page.

**This replaced a build-time fetch with a hardcoded `FALLBACK` version.** That older approach
meant any GitHub blip during a Vercel build silently shipped a wrong version with nobody
told. Don't reintroduce a fallback: being a release behind is recoverable, being confidently
wrong is not.

### The blessed snapshot — why there are two data files

The page **paraphrases** skel's install steps and ruleset. Upstream's nine raw bullets and
four-line install blocks read badly on a landing page, so the copy is a deliberate rewrite
(`cd skel && ./install.sh` for two upstream lines; six punchy rules for eight bullets).

Rendering upstream text verbatim would downgrade the page — but a rewrite can quietly stop
being true. So:

- `src/data/cli.json` — synced from upstream, changes on its own.
- `src/data/reviewed.json` — the upstream wording as last reviewed by a human. Only ever
  changes via `pnpm bless`.

A test asserts the two agree. When skel changes a rule or an install step, CI fails with a
readable diff; you update the wording on the page and run `pnpm bless` to re-approve. The
sync workflow runs that guard **before** committing, so a drifted page is never deployed.

Only the **version** is rendered from synced data directly. Everything else on the page —
the demo tree especially — is editorial and should stay that way.

## Commands

```bash
pnpm dev / build / check
pnpm test      # build + playwright
pnpm sync      # refresh cli.json from skel's latest release
pnpm bless     # re-approve upstream wording after updating the page copy
```

## Traps

- **`astro preview` daemonizes with a TTY and stays in the foreground without one.**
  Playwright's `webServer` either reads its exit as a crash or blocks forever, so the server
  is started and stopped in `tests/global-setup.ts` / `global-teardown.ts`.
- **`generatedAt` is excluded from change detection** in the sync — it moves every run, so
  writing unconditionally would defeat the workflow's "commit only if the CLI moved" guard
  and land a junk commit, and a production deploy, every night.

## Release flow

skel's release workflow fires a `repository_dispatch` (`cli-release`) here; `sync.yml`
re-syncs, guards, and pushes; Vercel deploys on the push. Needs `SITE_DISPATCH_TOKEN` on the
**skel** repo. The old `SKEL_SH_DEPLOY_HOOK` in `make release` is gone — it only fired from
the one laptop holding `~/.zsh_secrets`, so a release published any other way never
refreshed the site.
