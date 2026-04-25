export type PageMode = 'competitive' | 'market-sizing'

export type AnimationState = 'idle' | 'running' | 'thinking' | 'returning'

export type ProgressStepStatus = 'pending' | 'active' | 'done'

export interface ProgressStep {
  label: string
  status: ProgressStepStatus
}

export interface Citation {
  title: string
  url: string
  source: string
}

export interface ReviewResult {
  score: number
  pass: boolean
  suggestions: string[]
  issues: string[]
}

export interface Report {
  content: string
  review: ReviewResult
  citations: Citation[]
}

export interface FollowUpQuestion {
  question: string
  round: number
  totalRounds: number
}

export interface Conversation {
  id: string
  title: string
  mode: PageMode
  query: string
  report?: Report
  createdAt: Date
}

export type ChatIntent = 'new_report' | 'followup' | 'revise'
