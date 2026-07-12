import { useRef, useState } from 'react'

const ACCEPT = '.mp3,.wav,.m4a,.mp4,.webm,.mpga'
const ALLOWED_EXT = ACCEPT.split(',')

function hasAllowedExt(name: string): boolean {
  const dot = name.lastIndexOf('.')
  return dot !== -1 && ALLOWED_EXT.includes(name.slice(dot).toLowerCase())
}

function UploadCloudIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
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
      className={`focus-ring cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-200 ${
        dragging
          ? 'scale-[1.01] border-brand-500 bg-brand-50 dark:bg-brand-500/10'
          : 'border-slate-300 bg-white hover:border-brand-300 hover:bg-brand-50/40 dark:border-white/15 dark:bg-white/[0.03] dark:hover:border-brand-400/40 dark:hover:bg-white/[0.06]'
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
        className={`mx-auto grid h-14 w-14 place-items-center rounded-full transition-colors duration-200 ${
          dragging
            ? 'bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300'
            : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400'
        }`}
      >
        <UploadCloudIcon />
      </div>
      <p className="mt-4 font-medium text-slate-900 dark:text-white">
        {dragging ? 'Drop it right here' : 'Drag & drop your recording here'}
      </p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        or click to browse · mp3, wav, m4a, mp4, webm · up to 25&nbsp;MB
      </p>
    </div>
      {reason && (
        <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{reason}</p>
      )}
    </>
  )
}
