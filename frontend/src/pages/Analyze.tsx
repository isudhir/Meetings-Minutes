import { useState } from 'react'
import UploadZone from '../components/UploadZone'
import Results from '../components/Results'
import { analyzeRecording } from '../lib/api'
import type { AnalyzeResponse } from '../types'

type Status = 'idle' | 'working' | 'done' | 'error'

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
      <path d="M12 9v4M12 16.5h.01" />
      <path d="M10.29 3.86 1.82 18a1.5 1.5 0 0 0 1.29 2.25h17.78A1.5 1.5 0 0 0 22.18 18L13.71 3.86a1.5 1.5 0 0 0-2.42 0Z" />
    </svg>
  )
}

export default function Analyze() {
  const [status, setStatus] = useState<Status>('idle')
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<AnalyzeResponse | null>(null)

  async function handleSelect(file: File) {
    setFileName(file.name)
    setStatus('working')
    setError('')
    try {
      const data = await analyzeRecording(file)
      setResult(data)
      setStatus('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setStatus('error')
    }
  }

  function reset() {
    setStatus('idle')
    setResult(null)
    setError('')
    setFileName('')
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      {status !== 'done' && (
        <>
          <h1 className="font-display text-3xl font-semibold text-slate-900 dark:text-white">Analyze a recording</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Upload your meeting audio and get minutes in under a minute.
          </p>
          <div className="mt-8">
            <UploadZone onSelect={handleSelect} disabled={status === 'working'} />
          </div>
        </>
      )}

      {status === 'working' && (
        <div className="mt-8 overflow-hidden rounded-xl border border-brand-200 bg-brand-50 p-5 text-brand-900 dark:border-brand-400/20 dark:bg-brand-500/10 dark:text-brand-200">
          <div className="flex items-center gap-3">
            <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            <span>
              Transcribing &amp; analyzing <strong>{fileName}</strong>&hellip; this can take up to a minute.
            </span>
          </div>
          <div className="relative mt-4 h-1.5 w-full overflow-hidden rounded-full bg-brand-200/70 dark:bg-white/10">
            <span className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-brand-500 dark:bg-brand-400 animate-shimmer" />
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="mt-8 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-800 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300">
          <WarningIcon />
          <div>
            <p className="font-medium">Analysis failed</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        </div>
      )}

      {status === 'done' && result && <Results data={result} onReset={reset} />}
    </div>
  )
}
