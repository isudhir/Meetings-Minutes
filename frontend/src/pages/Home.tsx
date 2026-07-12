import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/* ---- monoline icons (20px, single accent-agnostic stroke) ---- */
const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className: 'h-5 w-5',
}

const MicIcon = () => (
  <svg {...iconProps}>
    <rect x="9" y="2.5" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" />
  </svg>
)
const DocIcon = () => (
  <svg {...iconProps}>
    <path d="M7 2.5h7l4 4V21a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z" />
    <path d="M14 2.5V7h4M8.5 12h7M8.5 15.5h7M8.5 8.5h3" />
  </svg>
)
const CheckIcon = () => (
  <svg {...iconProps}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
)
const PulseIcon = () => (
  <svg {...iconProps}>
    <path d="M2.5 12h4l2.5-6 4 12 2.5-6h6" />
  </svg>
)
const ShareIcon = () => (
  <svg {...iconProps}>
    <path d="M12 15.5V3.5M12 3.5 8 7.5M12 3.5l4 4" />
    <path d="M4.5 13v6a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-6" />
  </svg>
)
const SwapIcon = () => (
  <svg {...iconProps}>
    <path d="M4 8h13l-3-3M20 16H7l3 3" />
  </svg>
)

const features: { icon: ReactNode; title: string; desc: string }[] = [
  { icon: <MicIcon />, title: 'Verbatim transcription', desc: 'Drop in any recording and get a clean, accurate transcript in one pass.' },
  { icon: <DocIcon />, title: 'Structured minutes', desc: 'Summary, discussion, decisions and takeaways — organized without you asking.' },
  { icon: <CheckIcon />, title: 'Action items with owners', desc: 'Every commitment captured next to the person who owns it.' },
  { icon: <PulseIcon />, title: 'Sentiment & topics', desc: 'A quick read on how the room felt and what it kept coming back to.' },
  { icon: <ShareIcon />, title: 'Export anywhere', desc: 'Copy Markdown, download a .md file, or print a clean PDF for the team.' },
  { icon: <SwapIcon />, title: 'Your choice of model', desc: 'Runs on OpenAI today; switch to OpenRouter with a single config change.' },
]

const steps = [
  { n: '01', title: 'Upload', desc: 'Drop in a recording — mp3, wav, m4a, mp4 or webm, up to 25 MB.' },
  { n: '02', title: 'Analyze', desc: 'It transcribes the audio and pulls out the parts that matter.' },
  { n: '03', title: 'Share', desc: 'Skim the minutes, then export them to your team in seconds.' },
]

/* A static mock of the real output, so the hero shows the product itself. */
function MinutesPreview() {
  return (
    <div className="card overflow-hidden p-0 shadow-lift">
      <div className="flex items-center gap-2 border-b border-ink-200 px-4 py-3 dark:border-white/10">
        <span className="h-2.5 w-2.5 rounded-full bg-ink-200 dark:bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-ink-200 dark:bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-ink-200 dark:bg-white/15" />
        <span className="ml-2 text-xs font-medium text-ink-400">q3-product-sync.mp3</span>
      </div>
      <div className="space-y-4 p-5">
        <div>
          <h3 className="font-display text-xl font-semibold text-ink-900 dark:text-white">Q3 Product Sync</h3>
          <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">Jul 8 · 32 min · 5 attendees</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="chip-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
            Positive
          </span>
          <span className="chip-outline">Roadmap</span>
          <span className="chip-outline">Hiring</span>
        </div>
        <p className="text-sm leading-relaxed text-ink-600 dark:text-ink-300">
          The team locked the Q3 roadmap, agreed to ship pricing tiers before the sales kickoff, and
          opened two backend roles to keep the release on track.
        </p>
        <div className="rounded-lg border border-ink-200 bg-ink-50/60 p-3 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
            Action items
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2.5">
              <span className="grid h-4 w-4 place-items-center rounded-[5px] bg-accent-500 text-white">
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              </span>
              <span className="font-semibold text-ink-800 dark:text-ink-100">Priya</span>
              <span className="text-ink-600 dark:text-ink-300">finalize pricing tiers</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="grid h-4 w-4 place-items-center rounded-[5px] bg-accent-500 text-white">
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              </span>
              <span className="font-semibold text-ink-800 dark:text-ink-100">Marcus</span>
              <span className="text-ink-600 dark:text-ink-300">share the roadmap deck</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-ink-200 dark:border-white/10">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-dotgrid [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,black,transparent)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div>
            <p className="eyebrow animate-fade-up">Meeting notes, handled</p>
            <h1 className="mt-4 max-w-xl text-balance font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink-900 [animation-delay:75ms] animate-fade-up sm:text-5xl lg:text-[3.5rem] dark:text-white">
              Every recording, turned into minutes worth keeping.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-600 [animation-delay:150ms] animate-fade-up dark:text-ink-300">
              Upload the audio from any meeting and get an organized summary, the decisions that were
              made, and who owns what — ready to share before everyone's left the call.
            </p>
            <div className="mt-8 flex flex-col gap-3 [animation-delay:225ms] animate-fade-up sm:flex-row sm:items-center">
              <Link to="/app" className="btn-primary px-5 py-3 text-base">
                Analyze a recording
              </Link>
              <a href="#how" className="btn-ghost px-4 py-3 text-base">
                See how it works
              </a>
            </div>
            <p className="mt-6 text-sm text-ink-500 [animation-delay:300ms] animate-fade-up dark:text-ink-400">
              No sign-up · Nothing stored · Export to Markdown or PDF
            </p>
          </div>
          <div className="[animation-delay:200ms] animate-fade-up lg:pl-6">
            <MinutesPreview />
          </div>
        </div>
      </section>

      {/* Features — framed hairline grid */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-2xl">
          <p className="eyebrow">What you get back</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl dark:text-white">
            One upload. A full set of minutes.
          </h2>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-ink-200 bg-ink-200 sm:grid-cols-2 lg:grid-cols-3 dark:border-white/10 dark:bg-white/10">
          {features.map((f) => (
            <div
              key={f.title}
              className="group bg-white p-6 transition-colors duration-200 hover:bg-ink-50 dark:bg-ink-950 dark:hover:bg-white/[0.03]"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 text-ink-500 transition-colors duration-200 group-hover:border-accent-300 group-hover:text-accent-600 dark:border-white/10 dark:text-ink-300 dark:group-hover:border-accent-400/40 dark:group-hover:text-accent-400">
                {f.icon}
              </span>
              <h3 className="mt-4 font-semibold text-ink-900 dark:text-white">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-600 dark:text-ink-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works — editorial numbered steps */}
      <section id="how" className="border-t border-ink-200 dark:border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl dark:text-white">
            Three steps, about a minute.
          </h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {steps.map((s) => (
              <div key={s.n} className="border-t-2 border-ink-900 pt-5 dark:border-white">
                <span className="font-display text-3xl font-semibold text-ink-300 dark:text-ink-600">{s.n}</span>
                <h3 className="mt-2 text-lg font-semibold text-ink-900 dark:text-white">{s.title}</h3>
                <p className="mt-1.5 text-ink-600 dark:text-ink-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — clean ink panel */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="relative overflow-hidden rounded-2xl bg-ink-950 px-8 py-14 text-center dark:border dark:border-white/10">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-dotgrid opacity-40" />
          <div className="relative">
            <h2 className="mx-auto max-w-xl font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Stop writing up meetings by hand.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-ink-300">
              Upload a recording and read the minutes. No account required.
            </p>
            <Link
              to="/app"
              className="focus-ring mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-base font-semibold text-ink-950 transition-all duration-200 hover:bg-ink-100 active:scale-[0.98]"
            >
              Analyze a recording
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
