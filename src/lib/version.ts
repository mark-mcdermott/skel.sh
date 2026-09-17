const REPO = 'mark-mcdermott/skel'

/**
 * Shown when GitHub can't be reached at build time. The site still builds and
 * still says something true-ish rather than failing the deploy over a version
 * badge — but it will drift, so it's deliberately the only hardcoded version
 * in the project and worth bumping if it ever actually shows up in production.
 */
const FALLBACK = '0.3.2'

type Tag = { name: string }

const isTagArray = (value: unknown): value is Tag[] =>
  Array.isArray(value) && value.every((tag) => typeof (tag as Tag)?.name === 'string')

/** Descending semver. Tags that don't parse sort last rather than throwing. */
const compareSemver = (a: string, b: string): number => {
  const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number)
  const [aMajor = -1, aMinor = -1, aPatch = -1] = parse(a)
  const [bMajor = -1, bMinor = -1, bPatch = -1] = parse(b)
  return bMajor - aMajor || bMinor - aMinor || bPatch - aPatch
}

/**
 * The released version of skel, read from the repo's git tags at build time.
 *
 * Tags — not `/releases/latest` — because `make release` pushes a tag and does
 * not create a GitHub Release. Keying off releases would leave this frozen at
 * whatever was last tagged by hand, which is the exact staleness this is meant
 * to prevent. A redeploy is what refreshes it; see the deploy hook in the skel
 * repo's release step.
 */
export const getLatestVersion = async (): Promise<string> => {
  const token = process.env.GITHUB_TOKEN

  try {
    const response = await fetch(`https://api.github.com/repos/${REPO}/tags?per_page=100`, {
      headers: {
        Accept: 'application/vnd.github+json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) throw new Error(`GitHub responded ${response.status}`)

    const tags: unknown = await response.json()
    if (!isTagArray(tags) || tags.length === 0) throw new Error('no tags returned')

    const latest = tags.map((tag) => tag.name).sort(compareSemver)[0]
    return latest.replace(/^v/, '')
  } catch (error) {
    console.warn(
      `[version] Falling back to ${FALLBACK} — could not read tags from ${REPO}: ${
        error instanceof Error ? error.message : error
      }`,
    )
    return FALLBACK
  }
}
