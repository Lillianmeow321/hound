import type { Report, ProgressStep, AnimationState, FollowUpQuestion } from './types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// ─── Shared SSE helper ───────────────────────────────────────────────────────
interface SseHandlers {
  onStep: (step: ProgressStep) => void
  onAnimationState: (state: AnimationState) => void
  onReport: (report: Report) => void
  onError?: (msg: string) => void
}

function listenSse(url: string, handlers: SseHandlers): Promise<void> {
  return new Promise((resolve, reject) => {
    const es = new EventSource(url)
    let settled = false  // true once 'done' received; blocks onerror from overriding

    let reportContent = ''
    let reviewData = { score: 7, pass: true, suggestions: [] as string[], issues: [] as string[] }
    let citations: Report['citations'] = []

    es.onmessage = (e) => {
      let data: Record<string, unknown>
      try { data = JSON.parse(e.data) } catch { return }

      switch (data.type) {
        case 'step':
          handlers.onStep({ label: data.label as string, status: 'active' })
          break
        case 'anim':
          handlers.onAnimationState(data.state as AnimationState)
          break
        case 'report':
          reportContent = data.content as string
          break
        case 'review':
          reviewData = {
            score: (data.score as number) ?? 7,
            pass: (data.pass as boolean) ?? true,
            suggestions: (data.suggestions as string[]) ?? [],
            issues: (data.issues as string[]) ?? [],
          }
          break
        case 'citations':
          citations = (data.items as Report['citations']) ?? []
          break
        case 'done':
          settled = true
          es.close()
          handlers.onReport({ content: reportContent, review: reviewData, citations })
          resolve()
          break
        case 'error': {
          if (settled) break
          settled = true
          es.close()
          const msg = data.message as string
          handlers.onError?.(msg)
          reject(new Error(msg))
          break
        }
      }
    }

    // onerror fires when server closes connection — ignore if done already received
    es.onerror = () => {
      if (settled) return
      settled = true
      es.close()
      const msg = '连接后端失败，请确认 api_server.py 已启动'
      handlers.onError?.(msg)
      reject(new Error(msg))
    }
  })
}

// ─── Competitive analysis ────────────────────────────────────────────────────
export interface StreamOptions {
  onStep: (step: ProgressStep) => void
  onAnimationState: (state: AnimationState) => void
  onReport: (report: Report) => void
  onError?: (msg: string) => void
}

export async function generateCompetitiveReport(
  query: string,
  opts: StreamOptions,
): Promise<void> {
  const url = `${API_BASE}/api/competitive/stream?query=${encodeURIComponent(query)}`
  return listenSse(url, opts)
}

// ─── Market sizing ────────────────────────────────────────────────────────────
export interface MarketSizingOptions {
  onFollowUp: (q: FollowUpQuestion) => Promise<string>
  onStep: (step: ProgressStep) => void
  onAnimationState: (state: AnimationState) => void
  onReport: (report: Report) => void
  onError?: (msg: string) => void
}

export async function generateMarketSizingReport(
  initialInput: string,
  opts: MarketSizingOptions,
): Promise<void> {
  const history: { question: string; answer: string }[] = []
  let companyInfo = ''

  // Collect follow-up Q&A (up to 3 rounds)
  // Don't call onStep here — page shows dots via phase='collecting'; only SSE events use onStep
  for (let round = 0; round < 3; round++) {
    opts.onAnimationState('thinking')

    const res: { ready: boolean; summary?: string; question?: string } = await fetch(
      `${API_BASE}/api/market-sizing/collect`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: initialInput, history }),
      },
    ).then((r) => r.json())

    if (res.ready && res.summary) {
      companyInfo = res.summary
      break
    }

    if (!res.question) break

    const answer = await opts.onFollowUp({
      question: res.question,
      round: round + 1,
      totalRounds: 3,
    })

    if (!answer.trim()) break
    history.push({ question: res.question, answer })
  }

  // Fallback: use all collected info if never got ready:true
  if (!companyInfo) {
    companyInfo =
      initialInput +
      history.map((qa) => `\n${qa.question} ${qa.answer}`).join('')
  }

  // Stream the report
  const url = `${API_BASE}/api/market-sizing/stream?company_info=${encodeURIComponent(companyInfo)}`
  return listenSse(url, opts)
}

// ─── Follow-up chat ───────────────────────────────────────────────────────────
export async function followUpChat(query: string, report: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/followup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, report }),
  })
  const data = await res.json()
  return data.answer as string
}
