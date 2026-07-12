import type { AnalyzeResponse, ChatMessage } from '../types'
import { getClientId } from './clientId'

async function errorFrom(res: Response): Promise<Error> {
  let detail = `Request failed (${res.status})`
  try {
    const body = await res.json()
    if (body?.detail) detail = body.detail
  } catch {
    /* keep default */
  }
  return new Error(detail)
}

export async function analyzeRecording(file: File): Promise<AnalyzeResponse> {
  const form = new FormData()
  form.append('file', file)

  const res = await fetch('/api/analyze', {
    method: 'POST',
    body: form,
    headers: { 'X-Client-Id': getClientId() },
  })
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function fetchChatAvailable(): Promise<boolean> {
  try {
    const res = await fetch('/api/config')
    if (!res.ok) return false
    const body = await res.json()
    return Boolean(body.chat_available)
  } catch {
    return false
  }
}

export async function sendChatMessage(
  transcript: string,
  messages: ChatMessage[],
): Promise<string> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Id': getClientId(),
    },
    body: JSON.stringify({ transcript, messages }),
  })
  if (!res.ok) throw await errorFrom(res)
  const body = await res.json()
  return body.reply as string
}
