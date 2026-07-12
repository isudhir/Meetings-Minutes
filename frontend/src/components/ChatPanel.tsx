import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../types'
import { sendChatMessage } from '../lib/api'

const SUGGESTIONS = [
  'What are the action items?',
  'Summarize the key decisions',
  'What was left unresolved?',
]

function ChatIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 text-accent-600 dark:text-accent-400"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 0 1-.9-3.8A8.38 8.38 0 0 1 12.5 3a8.38 8.38 0 0 1 8.5 8.5Z" />
    </svg>
  )
}

function TypingDots() {
  return (
    <span className="flex gap-1" aria-label="Thinking">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400 [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400 [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400" />
    </span>
  )
}

export default function ChatPanel({ transcript }: { transcript: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    setError('')
    const next: ChatMessage[] = [...messages, { role: 'user', content: trimmed }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const reply = await sendChatMessage(transcript, next)
      setMessages([...next, { role: 'assistant', content: reply }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void send(input)
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send(input)
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2">
        <ChatIcon />
        <h3 className="font-display text-lg font-semibold text-ink-900 dark:text-white">
          Ask about this meeting
        </h3>
      </div>
      <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
        Answers come only from this meeting&rsquo;s transcript.
      </p>

      {messages.length > 0 && (
        <div ref={scrollRef} className="mt-5 max-h-96 space-y-3 overflow-y-auto pr-1">
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={
                  m.role === 'user'
                    ? 'max-w-[85%] rounded-2xl rounded-br-md bg-ink-900 px-4 py-2.5 text-sm text-white dark:bg-white dark:text-ink-950'
                    : 'max-w-[85%] rounded-2xl rounded-bl-md border border-ink-200 bg-ink-50 px-4 py-2.5 text-sm text-ink-800 dark:border-white/10 dark:bg-white/[0.04] dark:text-ink-100'
                }
              >
                <p className="whitespace-pre-line leading-relaxed">{m.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md border border-ink-200 bg-ink-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
                <TypingDots />
              </div>
            </div>
          )}
        </div>
      )}

      {messages.length === 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => void send(s)}
              className="chip-outline cursor-pointer transition-colors hover:text-ink-900 hover:ring-ink-300 dark:hover:text-white dark:hover:ring-white/25"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}

      <form onSubmit={onSubmit} className="mt-4 flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Ask a question…"
          disabled={loading}
          className="focus-ring min-h-[2.75rem] flex-1 resize-none rounded-lg border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-ink-500"
        />
        <button type="submit" disabled={loading || !input.trim()} className="btn-primary">
          Send
        </button>
      </form>
    </div>
  )
}
