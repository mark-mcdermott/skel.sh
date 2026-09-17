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

## The version number

The version shown on the page is **not** written down here. `src/lib/version.ts`
reads the highest semver tag from the `mark-mcdermott/skel` repo at build time,
so the site tells the truth as of its last deploy.

That only works if something redeploys the site when skel is released. A Vercel
deploy hook is called as the last step of `make release` in the skel repo — if
that step is ever dropped, this page will quietly sit at whichever version was
current when it last built.

Set `GITHUB_TOKEN` in the Vercel project to avoid anonymous API rate limits on
builds. Without it the build still succeeds; it just falls back to the pinned
version in `version.ts` when GitHub says no.

## Assets

The mascot and the walkthrough recording are sourced from `skel-proj/branding/`
and `skel-proj/vids/`. The page uses the `.mp4` rather than the `.gif` — same
footage, a fifth of the bytes.
