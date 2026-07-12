import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { ChatMessage } from '../types'
import { fetchChatAvailable, sendChatMessage } from '../lib/api'
import { useChatContext } from '../lib/chatContext'

const MEETING_SUGGESTIONS = [
  'What are the action items?',
  'Summarize the key decisions',
  'What was left unresolved?',
]

const GENERAL_SUGGESTIONS = [
  'How does this app work?',
  'What files can I upload?',
  'Tips for better minutes',
]

function ChatIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 0 1-.9-3.8A8.38 8.38 0 0 1 12.5 3a8.38 8.38 0 0 1 8.5 8.5Z" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M18 6 6 18M6 6l12 12" />
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

export default function ChatLauncher() {
  const { transcript } = useChatContext()
  const mode: 'meeting' | 'general' = transcript ? 'meeting' : 'general'

  const [available, setAvailable] = useState(false)
  const [open, setOpen] = useState(false)
  // Two separate threads so switching between agents never mixes conversations.
  const [generalMessages, setGeneralMessages] = useState<ChatMessage[]>([])
  const [meetingMessages, setMeetingMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const messages = mode === 'meeting' ? meetingMessages : generalMessages
  const setMessages = mode === 'meeting' ? setMeetingMessages : setGeneralMessages
  const suggestions = mode === 'meeting' ? MEETING_SUGGESTIONS : GENERAL_SUGGESTIONS

  // Only offer chat when the server has it configured.
  useEffect(() => {
    let active = true
    fetchChatAvailable().then((ok) => {
      if (active) setAvailable(ok)
    })
    return () => {
      active = false
    }
  }, [])

  // A new (or cleared) meeting starts a fresh meeting thread.
  useEffect(() => {
    setMeetingMessages([])
    setInput('')
    setError('')
  }, [transcript])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading, open])

  useEffect(() => {
    if (!open) return
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    setError('')
    const next: ChatMessage[] = [...messages, { role: 'user', content: trimmed }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const reply = await sendChatMessage(transcript ?? '', next)
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

  if (!available) return null

  const title = mode === 'meeting' ? 'Ask about this meeting' : 'Assistant'
  const subtitle =
    mode === 'meeting'
      ? "Answers come only from this meeting's transcript."
      : 'Ask anything, or about how Minutes works.'

  return (
    <>
      {/* Floating launcher — hidden while the panel is open */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open chat"
          className="focus-ring fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-accent-600 text-white shadow-lift transition-all duration-200 hover:bg-accent-500 active:scale-95 dark:bg-accent-500 dark:hover:bg-accent-400"
        >
          <ChatIcon />
        </button>
      )}

      {/* Scrim */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden
        className={`fixed inset-0 z-40 bg-ink-950/30 backdrop-blur-[1px] transition-opacity duration-300 dark:bg-black/50 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Slide-over panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-paper shadow-lift transition-transform duration-300 ease-out dark:bg-ink-950 dark:border-l dark:border-white/10 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-ink-200 px-5 py-4 dark:border-white/10">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-50 text-accent-600 dark:bg-accent-500/10 dark:text-accent-400">
              <ChatIcon className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-display text-base font-semibold text-ink-900 dark:text-white">{title}</h2>
              <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close chat"
            className="focus-ring -mr-1 rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800 dark:text-ink-400 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
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

        {/* Composer */}
        <div className="border-t border-ink-200 px-5 py-4 dark:border-white/10">
          {error && <p className="mb-2 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
          <form onSubmit={onSubmit} className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Ask a question…"
              disabled={loading}
              className="focus-ring min-h-[2.75rem] max-h-32 flex-1 resize-none rounded-lg border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-ink-500"
            />
            <button type="submit" disabled={loading || !input.trim()} className="btn-primary">
              Send
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
