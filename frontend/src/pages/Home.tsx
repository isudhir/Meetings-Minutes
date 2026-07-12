import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <rect x="9" y="2.5" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" />
    </svg>
  )
}

function DocIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M7 2.5h7l4 4V21a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z" />
      <path d="M14 2.5V7h4M8.5 12h7M8.5 15.5h7M8.5 8.5h3" />
    </svg>
  )
}

function CheckBadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M12 2.5l2.2 1.2 2.5-.3 1 2.3 2.1 1.4-.6 2.4.6 2.4-2.1 1.4-1 2.3-2.5-.3L12 17.5l-2.2-1.2-2.5.3-1-2.3-2.1-1.4.6-2.4-.6-2.4 2.1-1.4 1-2.3 2.5.3L12 2.5Z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M4 20V10M11 20V4M18 20v-7" />
      <path d="M2.5 20.5h19" />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M12 15.5V3.5M12 3.5 8 7.5M12 3.5l4 4" />
      <path d="M4.5 13v6a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-6" />
    </svg>
  )
}

function PlugIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M9 2.5v4M15 2.5v4M6.5 6.5h11l-.6 6.6a4.9 4.9 0 0 1-4.9 4.4v0a4.9 4.9 0 0 1-4.9-4.4l-.6-6.6Z" />
      <path d="M12 17.5V21" />
    </svg>
  )
}

const features: { icon: ReactNode; title: string; desc: string }[] = [
  { icon: <MicIcon />, title: 'Accurate transcription', desc: 'Upload any recording and get a clean, verbatim transcript powered by OpenAI.' },
  { icon: <DocIcon />, title: 'Structured minutes', desc: 'Summary, discussion points, decisions, and takeaways — organized automatically.' },
  { icon: <CheckBadgeIcon />, title: 'Action items with owners', desc: 'Every commitment captured with who owns it, so nothing slips.' },
  { icon: <ChartIcon />, title: 'Extra insights', desc: 'Sentiment read and key topics surfaced from the conversation.' },
  { icon: <ShareIcon />, title: 'Export anywhere', desc: 'Copy as Markdown, download a .md file, or save a polished PDF.' },
  { icon: <PlugIcon />, title: 'Swappable AI provider', desc: 'Runs on OpenAI today, switch to OpenRouter with one config change.' },
]

const steps = [
  { n: '1', title: 'Upload', desc: 'Drop in an audio file from your meeting (mp3, wav, m4a, and more).' },
  { n: '2', title: 'Analyze', desc: 'The app transcribes the audio and extracts the important parts.' },
  { n: '3', title: 'Share', desc: 'Review the minutes and export them to your team in seconds.' },
]

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-40 -z-10 flex justify-center blur-3xl"
        >
          <div className="aspect-[1.2/1] w-[50rem] bg-gradient-to-tr from-brand-300 via-brand-200 to-fuchsia-200 opacity-40 dark:from-brand-700 dark:via-brand-800 dark:to-fuchsia-900 dark:opacity-30" />
        </div>

        <div className="mx-auto max-w-6xl px-6 py-20 text-center sm:py-28">
          <span className="chip-brand animate-fade-up">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            AI-powered meeting notes
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-balance font-display text-4xl font-semibold tracking-tight text-slate-900 sm:text-6xl dark:text-white [animation-delay:75ms] animate-fade-up">
            Turn any recording into clear, shareable minutes
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-slate-600 [animation-delay:150ms] animate-fade-up dark:text-slate-300">
            Upload a meeting recording and get an organized summary, decisions, action items, and
            insights — ready to share in seconds.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row [animation-delay:225ms] animate-fade-up">
            <Link to="/app" className="btn-primary px-6 py-3 text-base">
              Analyze a recording
            </Link>
            <a href="#features" className="btn-ghost px-6 py-3 text-base">
              See features
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-white py-20 transition-colors duration-200 dark:bg-white/[0.02]">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold text-slate-900 sm:text-4xl dark:text-white">
              Everything you need after a meeting
            </h2>
            <p className="mt-3 text-slate-600 dark:text-slate-400">
              One upload, a complete set of minutes — no manual note-taking required.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="card group p-6 hover:-translate-y-0.5 hover:shadow-card-hover">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600 transition-colors duration-200 group-hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:group-hover:bg-brand-500/20">
                  {f.icon}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">{f.title}</h3>
                <p className="mt-2 text-slate-600 dark:text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-display text-3xl font-semibold text-slate-900 sm:text-4xl dark:text-white">
            How it works
          </h2>
          <div className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
            <div
              aria-hidden="true"
              className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent md:block dark:via-white/15"
            />
            {steps.map((s) => (
              <div key={s.n} className="relative text-center">
                <div className="relative mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-gradient text-lg font-semibold text-white shadow-glow">
                  {s.n}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">{s.title}</h3>
                <p className="mt-2 text-slate-600 dark:text-slate-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-slate-900 py-16 text-center text-white dark:bg-gradient-to-br dark:from-brand-950 dark:via-[#0B0A18] dark:to-brand-950">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgb(124,109,242,0.35),transparent_60%)]"
        />
        <div className="relative mx-auto max-w-3xl px-6">
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">Ready to try it?</h2>
          <p className="mt-4 text-slate-300">No sign-up. Upload a recording and see the minutes.</p>
          <Link to="/app" className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 font-medium text-slate-900 shadow-soft transition-all duration-200 hover:bg-brand-50 active:scale-[0.98]">
            Get started
          </Link>
        </div>
      </section>
    </div>
  )
}
