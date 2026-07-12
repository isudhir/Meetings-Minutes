import type { AnalyzeResponse } from '../types'
import { copyMarkdown, downloadMarkdown, downloadPdf } from '../lib/export'
import { useState } from 'react'
import ChatPanel from './ChatPanel'

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
      <path d="M4.5 15.5h-1a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </svg>
  )
}

function MarkdownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M6 15V9l3 3 3-3v6M15.5 9v6M13 12.5l2.5 2.5 2.5-2.5" />
    </svg>
  )
}

function PdfIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M7 2.5h7l4 4V21a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z" />
      <path d="M14 2.5V7h4M9 17v-4h1.3a1.3 1.3 0 1 1 0 2.6H9M13 17v-4h1.6a1.4 1.4 0 0 1 0 4H13Z" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M20 11a8 8 0 1 0-2.3 5.7M20 11V5M20 11h-6" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0 transition-transform duration-200 group-open:rotate-180">
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null
  return (
    <div>
      <h3 className="font-display text-lg font-semibold text-ink-900 dark:text-white">{title}</h3>
      <ul className="mt-3 space-y-2.5">
        {items.map((i, idx) => (
          <li key={idx} className="flex gap-3 text-ink-700 dark:text-ink-300">
            <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />
            <span className="leading-relaxed">{i}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const sentimentStyles: Record<string, string> = {
  positive: 'bg-accent-50 text-accent-700 ring-accent-200 dark:bg-accent-500/10 dark:text-accent-300 dark:ring-accent-400/20',
  neutral: 'bg-ink-100 text-ink-600 ring-ink-200 dark:bg-white/[0.06] dark:text-ink-300 dark:ring-white/10',
  negative: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20',
  mixed: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20',
}

const sentimentDot: Record<string, string> = {
  positive: 'bg-accent-500',
  neutral: 'bg-ink-400',
  negative: 'bg-rose-500',
  mixed: 'bg-amber-500',
}

export default function Results({ data, onReset }: { data: AnalyzeResponse; onReset: () => void }) {
  const m = data.minutes
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')

  async function handleCopy() {
    try {
      await copyMarkdown(m)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('error')
    } finally {
      setTimeout(() => setCopyStatus('idle'), 1500)
    }
  }

  const meta = [m.date, m.location, m.attendees.length ? `${m.attendees.length} attendees` : null]
    .filter(Boolean)
    .join(' · ')

  const sentiment = sentimentStyles[m.sentiment.overall] ?? sentimentStyles.neutral
  const dot = sentimentDot[m.sentiment.overall] ?? sentimentDot.neutral

  return (
    <div className="animate-fade-up space-y-6">
      {/* Header + export bar */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-200 pb-6 dark:border-white/10">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl dark:text-white">
            {m.title}
          </h2>
          {meta && <p className="mt-1.5 text-sm text-ink-500 dark:text-ink-400">{meta}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleCopy} className="btn-secondary">
            <CopyIcon />
            {copyStatus === 'copied' ? 'Copied' : copyStatus === 'error' ? 'Copy failed' : 'Copy'}
          </button>
          <button onClick={() => downloadMarkdown(m)} className="btn-secondary">
            <MarkdownIcon />
            .md
          </button>
          <button onClick={() => downloadPdf(m)} className="btn-secondary">
            <PdfIcon />
            PDF
          </button>
          <button onClick={onReset} className="btn-primary">
            <RefreshIcon />
            New
          </button>
        </div>
      </div>

      {/* Insights */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`chip ${sentiment}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
          {m.sentiment.overall}
        </span>
        {m.topics.map((t, idx) => (
          <span key={`${t}-${idx}`} className="chip-outline">
            {t}
          </span>
        ))}
      </div>

      {/* The minutes, as one document */}
      <div className="card divide-y divide-ink-200 dark:divide-white/10">
        {m.attendees.length > 0 && (
          <div className="p-6">
            <h3 className="font-display text-lg font-semibold text-ink-900 dark:text-white">Attendees</h3>
            <p className="mt-2 text-ink-700 dark:text-ink-300">{m.attendees.join(', ')}</p>
          </div>
        )}
        {m.summary && (
          <div className="p-6">
            <h3 className="font-display text-lg font-semibold text-ink-900 dark:text-white">Summary</h3>
            <p className="mt-2 whitespace-pre-line leading-relaxed text-ink-700 dark:text-ink-300">{m.summary}</p>
          </div>
        )}
        {m.discussion_points.length > 0 && (
          <div className="p-6">
            <Section title="Discussion points" items={m.discussion_points} />
          </div>
        )}
        {m.key_decisions.length > 0 && (
          <div className="p-6">
            <Section title="Key decisions" items={m.key_decisions} />
          </div>
        )}
        {m.takeaways.length > 0 && (
          <div className="p-6">
            <Section title="Takeaways" items={m.takeaways} />
          </div>
        )}
      </div>

      {/* Action items — as a checklist */}
      {m.action_items.length > 0 && (
        <div className="card p-6">
          <h3 className="font-display text-lg font-semibold text-ink-900 dark:text-white">Action items</h3>
          <ul className="mt-4 space-y-3">
            {m.action_items.map((a, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border border-accent-300 text-accent-600 dark:border-accent-400/40 dark:text-accent-400">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                </span>
                <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-semibold text-ink-900 dark:text-white">{a.owner}</span>
                  <span className="text-ink-700 dark:text-ink-300">{a.task}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Transcript */}
      <details className="card group p-6">
        <summary className="flex cursor-pointer list-none items-center justify-between font-display text-lg font-semibold text-ink-900 [&::-webkit-details-marker]:hidden dark:text-white">
          Full transcript
          <ChevronIcon />
        </summary>
        <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink-600 dark:text-ink-400">{data.transcript}</p>
      </details>

      {/* Follow-up chat, grounded in the transcript */}
      {data.chat_available && <ChatPanel transcript={data.transcript} />}
    </div>
  )
}
