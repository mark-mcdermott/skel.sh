/**
 * Generates public/og.png — the social card.
 *
 * Run by hand (`pnpm build:og`), not as part of the build: it renders text with
 * Space Grotesk and IBM Plex Mono from the *system's* fonts, which a CI box
 * won't have. The output is committed, so a build never needs to reproduce it.
 * If you regenerate it, make sure both families are installed locally first.
 */
import sharp from 'sharp'

const W = 1200
const H = 630
const BONE = '#faf8f5'
const INK = '#14110f'
const MUTED = '#6b625c'
const COLUMN_X = 540

const mascot = await sharp('src/assets/mascot.png').resize({ height: 400, fit: 'inside' }).toBuffer()
const { height: mascotHeight } = await sharp(mascot).metadata()

const text = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <text x="${COLUMN_X}" y="288"
        font-family="Space Grotesk" font-weight="700" font-size="104" fill="${INK}">skel</text>
  <text x="${COLUMN_X}" y="348"
        font-family="Space Grotesk" font-weight="400" font-size="34" fill="${INK}">Scaffold a project by typing a tree.</text>
  <text x="${COLUMN_X}" y="412"
        font-family="IBM Plex Mono" font-weight="500" font-size="24" fill="${MUTED}" letter-spacing="1">skel.sh</text>
</svg>
`)

await sharp({ create: { width: W, height: H, channels: 4, background: BONE } })
  .composite([
    { input: mascot, left: 190, top: Math.round((H - mascotHeight) / 2) },
    { input: text, left: 0, top: 0 },
  ])
  .png()
  .toFile('public/og.png')

console.log('public/og.png written')
