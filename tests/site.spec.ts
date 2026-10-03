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

/**
 * The toggle has three states, not two: no stored choice means "follow the
 * system". The third test is the one worth having — it is easy to write a
 * toggle that pins an explicit value forever, so that returning to the theme
 * your OS already prefers quietly stops tracking it.
 */
test.describe('theme toggle', () => {
  const theme = (page: import('@playwright/test').Page) =>
    page.evaluate(() => document.documentElement.dataset.theme)

  test('flips the theme and repaints the page', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/')

    const background = () =>
      page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    const before = await background()

    await page.click('[data-theme-toggle]')

    expect(await theme(page)).toBe('dark')
    // Asserting the attribute alone would pass even if no CSS responded to it.
    expect(await background()).not.toBe(before)
  })

  test('remembers the choice across a reload', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/')
    await page.click('[data-theme-toggle]')
    await page.reload()

    expect(await theme(page)).toBe('dark')
  })

  test('choosing the system preference stops overriding it', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')

    await page.click('[data-theme-toggle]')
    expect(await theme(page)).toBe('light')

    await page.click('[data-theme-toggle]')
    expect(await theme(page)).toBeUndefined()
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBeNull()
  })
})

/**
 * Both of these failed the QA pass in ways that look fine on screen: the skip
 * link worked, it just landed past the hero; and the copy button "worked" by
 * doing nothing at all when the clipboard was denied.
 */
test.describe('keyboard and clipboard affordances', () => {
  test('the skip link lands at the start of the content, not past it', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Tab')

    const link = page.locator('a', { hasText: 'Skip to content' })
    await expect(link).toBeFocused()
    // #demo starts *after* the hero, so skipping there skips the install command.
    await expect(link).toHaveAttribute('href', '#main')

    await page.keyboard.press('Enter')
    // Without tabindex="-1" on <main> the browser scrolls but focus never moves.
    await expect(page.locator('main')).toBeFocused()
  })

  test('a denied clipboard offers the keyboard shortcut instead of failing silently', async ({
    page,
  }) => {
    await page.goto('/')
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: () => Promise.reject(new Error('denied')) },
      })
    })

    const button = page.locator('[data-copy-button]').first()
    await button.click()

    await expect(button).toContainText(/press (⌘C|Ctrl\+C)/)
    await expect(button.locator('[data-copy-idle]')).toBeHidden()

    // The suggestion is only honest if the keystroke has something to copy.
    const selected = await page.evaluate(() => window.getSelection()?.toString() ?? '')
    expect(selected).toBe('brew install mark-mcdermott/skel/skel')
  })

  test('a working clipboard still reports success', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/')

    const button = page.locator('[data-copy-button]').first()
    await button.click()

    await expect(button).toContainText('Copied')
    await expect(button.locator('[data-copy-idle]')).toBeHidden()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      'brew install mark-mcdermott/skel/skel',
    )
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
