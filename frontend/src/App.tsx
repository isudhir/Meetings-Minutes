import { Outlet } from 'react-router-dom'
import Navbar from './components/Navbar'
import ChatLauncher from './components/ChatLauncher'
import { ChatProvider } from './lib/chatContext'

export default function App() {
  return (
    <ChatProvider>
      <div className="flex min-h-dvh flex-col bg-paper dark:bg-ink-950">
        <Navbar />
        <main className="flex-1">
          <Outlet />
        </main>
        <footer className="border-t border-ink-200 dark:border-white/10">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-8 text-sm text-ink-500 sm:flex-row dark:text-ink-400">
            <span className="font-display text-base font-semibold text-ink-800 dark:text-ink-100">
              Minutes
            </span>
            <span>Transcribed and summarized with OpenAI · nothing stored.</span>
          </div>
        </footer>
      </div>
      <ChatLauncher />
    </ChatProvider>
  )
}
