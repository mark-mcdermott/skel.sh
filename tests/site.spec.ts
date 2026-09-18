import { test, expect } from '@playwright/test'
import cli from '../src/data/cli.json' with { type: 'json' }
import reviewed from '../src/data/reviewed.json' with { type: 'json' }

/**
 * The page paraphrases skel's install steps and ruleset rather than quoting
 * them — the README's raw wording reads badly on a landing page. That rewrite
 * is what can quietly stop being true, so it is guarded here instead of being
 * replaced by upstream text.
 */
test.describe('the paraphrased copy still matches upstream', () => {
  test('upstream install steps are unchanged since they were last reviewed', () => {
    expect(cli.install).toEqual(reviewed.install)
  })

  test('upstream rules are unchanged since they were last reviewed', () => {
    expect(cli.rules).toEqual(reviewed.rules)
  })
})

test.describe('content is in step with the CLI', () => {
  test('renders the synced version', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('footer')).toContainText(`skel v${cli.version}`)
  })

  test('every upstream install method is still offered', async ({ page }) => {
    await page.goto('/')
    const body = (await page.locator('main').innerText()).toLowerCase()
    for (const { method } of cli.install) {
      expect(body).toContain(method.toLowerCase())
    }
  })

  test('the essential command of each install method is on the page', async ({ page }) => {
    await page.goto('/')
    const commands = await page.locator('[data-command]').evaluateAll((nodes) =>
      nodes.map((n) => n.getAttribute('data-command') ?? ''),
    )
    const joined = commands.join('\n')
    // The page condenses upstream's multi-line blocks (`cd skel && ./install.sh`),
    // so match on the distinguishing token rather than the exact line.
    for (const token of ['brew tap', 'brew install', './install.sh', 'make install', 'git clone']) {
      expect(joined, `no command containing "${token}"`).toContain(token)
    }
  })
})

test.describe('layout', () => {
  for (const width of [320, 375, 768, 1024, 1440]) {
    test(`no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/')
      const { clientWidth, scrollWidth } = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }))
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1)
    })
  }
})

test('no console errors', async ({ page }) => {
  const errors: string[] = []
  // Vercel's analytics scripts are served by the platform and 404 anywhere else.
  page.on('response', (r) => {
    if (r.status() >= 400 && !r.url().includes('_vercel/')) errors.push(`${r.status()} ${r.url()}`)
  })
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/', { waitUntil: 'networkidle' })
  expect(errors).toEqual([])
})
