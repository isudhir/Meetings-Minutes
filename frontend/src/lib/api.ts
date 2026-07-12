import type { AnalyzeResponse } from '../types'

export async function analyzeRecording(file: File): Promise<AnalyzeResponse> {
  const form = new FormData()
  form.append('file', file)

  const res = await fetch('/api/analyze', { method: 'POST', body: form })
  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (body?.detail) detail = body.detail
    } catch {
      /* keep default */
    }
    throw new Error(detail)
  }
  return res.json()
}
