import { createContext, useContext, useState, type ReactNode } from 'react'

/**
 * Holds the transcript of the meeting currently on screen, if any. The global
 * chat launcher reads this to decide which agent to run: a meeting-grounded
 * assistant when a transcript is present, a general assistant otherwise.
 */
interface ChatContextValue {
  transcript: string | null
  setTranscript: (transcript: string | null) => void
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [transcript, setTranscript] = useState<string | null>(null)
  return (
    <ChatContext.Provider value={{ transcript, setTranscript }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChatContext must be used within a ChatProvider')
  return ctx
}
