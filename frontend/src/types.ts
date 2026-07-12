export interface ActionItem {
  owner: string
  task: string
}

export interface Sentiment {
  overall: 'positive' | 'neutral' | 'negative' | 'mixed'
  note: string
}

export interface Minutes {
  title: string
  date: string | null
  location: string | null
  attendees: string[]
  summary: string
  discussion_points: string[]
  takeaways: string[]
  action_items: ActionItem[]
  key_decisions: string[]
  sentiment: Sentiment
  topics: string[]
}

export interface AnalyzeResponse {
  transcript: string
  minutes: Minutes
  provider: string
}
