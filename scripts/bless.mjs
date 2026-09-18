/**
 * Re-blesses the upstream text this site paraphrases.
 *
 * The page's install steps and ruleset are deliberate rewrites — the README's
 * raw bullets and four-line install blocks read badly on a landing page. That
 * means they can quietly stop being true when skel changes. So the upstream
 * wording is frozen in reviewed.json, and a test compares it against whatever
 * the sync last pulled. When skel changes a rule or an install step, CI fails
 * with a readable diff, you update the copy on the page, and re-bless here.
 *
 *   pnpm bless
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const CLI = fileURLToPath(new URL('../src/data/cli.json', import.meta.url))
const REVIEWED = fileURLToPath(new URL('../src/data/reviewed.json', import.meta.url))

const cli = JSON.parse(await readFile(CLI, 'utf8'))
const reviewed = {
  note: 'Upstream text the site paraphrases. Regenerate with `pnpm bless` after updating the copy on the page to match.',
  blessedAt: new Date().toISOString(),
  ref: cli.ref,
  install: cli.install,
  rules: cli.rules,
}

await writeFile(REVIEWED, `${JSON.stringify(reviewed, null, 2)}\n`)
console.log(`✓ blessed ${cli.repo}@${cli.ref} — ${cli.install.length} install methods, ${cli.rules.length} rules`)
