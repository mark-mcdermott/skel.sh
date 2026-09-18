import { stopServer } from './global-setup'

export default async function globalTeardown() {
  // Only stop the server if this run started it.
  if (process.env.PW_OWNS_SERVER !== '1') return
  await stopServer()
}
