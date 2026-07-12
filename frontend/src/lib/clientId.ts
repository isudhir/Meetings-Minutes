// A stable per-browser id, sent with requests so the server can rate-limit by
// browser as well as by IP. Not used for tracking — just to tell browsers apart.
const KEY = 'mm-client-id'

export function getClientId(): string {
  try {
    let id = localStorage.getItem(KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    // Private mode / storage disabled — fall back to a per-session id.
    return 'anon'
  }
}
