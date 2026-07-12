import { Outlet } from 'react-router-dom'
import Navbar from './components/Navbar'

export default function App() {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 dark:bg-[#0B0A18]">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500 transition-colors duration-200 dark:border-white/10 dark:bg-[#0B0A18] dark:text-slate-400">
        Built with FastAPI + React · Meeting Minutes AI
      </footer>
    </div>
  )
}
