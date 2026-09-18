import { spawn, execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { PORT, baseURL } from './server-config'

const run = promisify(execFile)

async function responds(): Promise<boolean> {
  try {
    return (await fetch(baseURL, { signal: AbortSignal.timeout(1500) })).ok
  } catch {
    return false
  }
}

/**
 * Playwright's built-in `webServer` cannot run this: `astro preview` daemonizes
 * when it has a TTY, and Playwright reads that exit as a crash. It only ever
 * passed by winning a race between the URL going ready and Playwright noticing.
 *
 * Awaiting the command instead is no good either, because without a TTY it may
 * stay in the foreground and never resolve. So spawn it detached and poll the
 * URL: that works whether it daemonizes or keeps running, in a terminal or on
 * a CI runner.
 */
export default async function globalSetup() {
  if (await responds()) {
    process.env.PW_OWNS_SERVER = ''
    return
  }

  const child = spawn('npx', ['astro', 'preview', '--port', String(PORT)], {
    detached: true,
    stdio: 'ignore',
  })
  child.unref()
  process.env.PW_OWNS_SERVER = '1'
  if (child.pid) process.env.PW_SERVER_PID = String(child.pid)

  for (let i = 0; i < 120; i++) {
    if (await responds()) return
    await new Promise((r) => setTimeout(r, 250))
  }

  await stopServer()
  throw new Error(`preview server never became ready at ${baseURL}`)
}

export async function stopServer() {
  await run('npx', ['astro', 'preview', 'stop']).catch(() => {})

  // If it stayed in the foreground, the daemon command above is a no-op and the
  // spawned process is still the one serving.
  const pid = Number(process.env.PW_SERVER_PID)
  if (pid) {
    try {
      process.kill(-pid, 'SIGTERM')
    } catch {
      try {
        process.kill(pid, 'SIGTERM')
      } catch {
        /* already gone */
      }
    }
  }
}
