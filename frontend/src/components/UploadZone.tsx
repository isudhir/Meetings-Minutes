import { useRef, useState } from 'react'

const ACCEPT = '.mp3,.wav,.m4a,.mp4,.webm,.mpga'
const ALLOWED_EXT = ACCEPT.split(',')

function hasAllowedExt(name: string): boolean {
  const dot = name.lastIndexOf('.')
  return dot !== -1 && ALLOWED_EXT.includes(name.slice(dot).toLowerCase())
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M7 18a4.5 4.5 0 0 1-.5-8.98A5.5 5.5 0 0 1 17.2 8.1 4 4 0 0 1 17 16" />
      <path d="M12 12v7M9 15.5 12 12l3 3.5" />
    </svg>
  )
}

export default function UploadZone({
  onSelect,
  disabled,
}: {
  onSelect: (file: File) => void
  disabled: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [reason, setReason] = useState('')

  function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    if (!hasAllowedExt(file.name)) {
      setReason(`"${file.name}" isn't a supported audio file. Use mp3, wav, m4a, mp4, webm, or mpga.`)
      return
    }
    setReason('')
    onSelect(file)
  }

  function openPicker() {
    if (!disabled) inputRef.current?.click()
  }

  return (
    <>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!disabled) handleFiles(e.dataTransfer.files)
        }}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            openPicker()
          }
        }}
        className={`focus-ring cursor-pointer rounded-xl border border-dashed p-10 text-center transition-colors duration-200 sm:p-14 ${
          dragging
            ? 'border-accent-500 bg-accent-50 dark:border-accent-400/50 dark:bg-accent-500/[0.07]'
            : 'border-ink-300 bg-white hover:border-ink-400 hover:bg-ink-50 dark:border-white/15 dark:bg-white/[0.02] dark:hover:border-white/25 dark:hover:bg-white/[0.04]'
        } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = '' // allow re-selecting the same file (e.g. after an error)
          }}
        />
        <div
          className={`mx-auto grid h-12 w-12 place-items-center rounded-full transition-colors duration-200 ${
            dragging
              ? 'bg-accent-100 text-accent-700 dark:bg-accent-500/20 dark:text-accent-300'
              : 'bg-ink-100 text-ink-500 dark:bg-white/[0.06] dark:text-ink-300'
          }`}
        >
          <UploadIcon />
        </div>
        <p className="mt-4 font-display text-lg font-semibold text-ink-900 dark:text-white">
          {dragging ? 'Drop it here' : 'Drag a recording in, or browse'}
        </p>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Up to 25&nbsp;MB · processed, never stored</p>
        <div className="mt-5 flex flex-wrap justify-center gap-1.5">
          {['mp3', 'wav', 'm4a', 'mp4', 'webm'].map((ext) => (
            <span key={ext} className="rounded-md bg-ink-100 px-2 py-0.5 font-mono text-xs text-ink-500 dark:bg-white/[0.06] dark:text-ink-400">
              {ext}
            </span>
          ))}
        </div>
      </div>
      {reason && <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{reason}</p>}
    </>
  )
}
