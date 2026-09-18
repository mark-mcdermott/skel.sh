/**
 * Pulls the canonical facts out of the skel CLI repo and writes them to
 * src/data/cli.json, which this site renders from. Run it in CI; commit the
 * result. The committed file is what builds read, so a network failure here can
 * never break a deploy — it can only leave the site one release behind, which
 * the scheduled run in .github/workflows/sync.yml catches.
 *
 * Pinned to the latest *release* rather than to main: the site documents the
 * version people can actually install.
 *
 * Note what is NOT synced. The site's demo tree and its ruleset are deliberate
 * editorial rewrites — the README's raw bullets and file1.txt example read far
 * worse on a landing page. Rendering the upstream text verbatim would be a
 * downgrade, so instead the raw rules are captured here and a test asserts the
 * site's copy still covers them. Upstream changes then fail CI loudly rather
 * than leaving the page quietly wrong.
 */
import { writeFile, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const REPO = 'mark-mcdermott/skel'
const OUT = fileURLToPath(new URL('../src/data/cli.json', import.meta.url))

const token = process.env.GITHUB_TOKEN
const headers = {
  accept: 'application/vnd.github+json',
  ...(token ? { authorization: `Bearer ${token}` } : {}),
}

async function latestRef() {
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers })
  if (!res.ok) {
    console.warn(`! releases/latest returned ${res.status} — falling back to main`)
    return 'main'
  }
  const { tag_name } = await res.json()
  return tag_name ?? 'main'
}

async function raw(ref, path) {
  const res = await fetch(`https://raw.githubusercontent.com/${REPO}/${ref}/${path}`)
  if (!res.ok) throw new Error(`fetch ${path}@${ref} failed: ${res.status}`)
  return res.text()
}

/** Text from a heading until the next heading of the same or higher level. */
function section(md, heading) {
  const re = new RegExp(`^(#{2,4})\\s+${heading}\\s*$`, 'im')
  const start = md.match(re)
  if (!start) throw new Error(`section "${heading}" not found — README structure changed`)
  const level = start[1].length
  const rest = md.slice(start.index + start[0].length)
  const next = rest.search(new RegExp(`^#{1,${level}}\\s+`, 'm'))
  return next === -1 ? rest : rest.slice(0, next)
}

/** `**Name**（…）:` followed by a fenced block -> { method, commands[] }. */
function installMethods(text) {
  const methods = [...text.matchAll(/\*\*(.+?)\*\*[^\n]*:\s*\n+```[a-z]*\n([\s\S]*?)```/g)].map(
    ([, method, body]) => ({
      method: method.trim(),
      commands: body
        .split('\n')
        .map((line) => line.replace(/\s{2,}#.*$/, '').trim())
        .filter(Boolean),
    }),
  )
  if (methods.length === 0) throw new Error('no install methods found — README structure changed')
  return methods
}

/** Top-level bullets, with any nested bullets folded onto the parent. */
function bullets(text) {
  const out = []
  for (const line of text.split('\n')) {
    const top = line.match(/^- (.+)$/)
    const nested = line.match(/^\s+- (.+)$/)
    if (top) out.push(top[1].trim())
    else if (nested && out.length) out[out.length - 1] += ` ${nested[1].trim()}`
  }
  if (out.length === 0) throw new Error('no rules found — README structure changed')
  return out
}

async function main() {
  const ref = await latestRef()
  const [script, readme] = await Promise.all([raw(ref, 'skel.sh'), raw(ref, 'README.md')])

  const version = script.match(/^VERSION="([^"]+)"/m)?.[1]
  if (!version) throw new Error('VERSION not found in the skel script')

  const data = {
    generatedAt: new Date().toISOString(),
    ref,
    version,
    repo: REPO,
    install: installMethods(section(readme, 'Install')),
    /** Raw upstream rules — a drift check for the site's editorial ruleset. */
    rules: bullets(section(readme, 'Rules')),
  }

  let previous = null
  try {
    previous = JSON.parse(await readFile(OUT, 'utf8'))
  } catch {
    /* first run */
  }

  // `generatedAt` moves every run, so writing unconditionally would defeat the
  // workflow's "commit only if the CLI moved" guard and land a junk commit —
  // and a production deploy — every night.
  const withoutTimestamp = ({ generatedAt, ...rest }) => JSON.stringify(rest)
  if (previous && withoutTimestamp(previous) === withoutTimestamp(data)) {
    console.log(`= ${REPO}@${ref} still v${version} — cli.json unchanged, not rewriting`)
    return
  }

  await writeFile(OUT, `${JSON.stringify(data, null, 2)}\n`)
  const moved = previous && previous.version !== version
  console.log(
    `✓ synced ${REPO}@${ref} — v${version}, ${data.install.length} install methods, ` +
      `${data.rules.length} rules` +
      (moved ? ` (was v${previous.version})` : ''),
  )
}

main().catch((err) => {
  console.error(`✗ sync failed: ${err.message}`)
  process.exit(1)
})
