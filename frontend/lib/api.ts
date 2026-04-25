import type { Report, ProgressStep, AnimationState, FollowUpQuestion } from './types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
// Log once on module load so you can see the URL in browser console
console.log('[Hound] API_BASE:', API_BASE)

// ─── Shared SSE helper ───────────────────────────────────────────────────────
interface SseHandlers {
  onStep: (step: ProgressStep) => void
  onAnimationState: (state: AnimationState) => void
  onReport: (report: Report) => void
  onError?: (msg: string) => void
  onDimensions?: (names: string[]) => void
  onDimDone?: (name: string, snippet?: string) => void
  onToken?: (content: string) => void
}

function listenSse(url: string, handlers: SseHandlers): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('[Hound] SSE connecting to:', url)
    const es = new EventSource(url)
    let settled = false

    let reportContent = ''
    let reviewData = { score: 7, pass: true, suggestions: [] as string[], issues: [] as string[] }
    let citations: Report['citations'] = []

    // 180-second hard timeout (report generation can take 1-2 min)
    const timeoutId = setTimeout(() => {
      if (settled) return
      settled = true
      es.close()
      const msg = '后端响应超时（180s）。报告生成需要 1-2 分钟，请刷新重试。若持续超时，请确认 Railway 服务正常运行。'
      console.error('[Hound] SSE timeout:', url)
      handlers.onError?.(msg)
      reject(new Error(msg))
    }, 180_000)

    es.onmessage = (e) => {
      let data: Record<string, unknown>
      try { data = JSON.parse(e.data) } catch {
        console.warn('[Hound] SSE unparseable message:', e.data)
        return
      }
      console.log('[Hound] SSE event:', data.type, data.label ?? data.state ?? '')

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
        case 'dimensions':
          handlers.onDimensions?.(data.names as string[])
          break
        case 'dim_done':
          handlers.onDimDone?.(data.name as string, data.snippet as string | undefined)
          break
        case 'token':
          reportContent += data.content as string
          handlers.onToken?.(data.content as string)
          break
        case 'done':
          clearTimeout(timeoutId)
          settled = true
          es.close()
          handlers.onReport({ content: reportContent, review: reviewData, citations })
          resolve()
          break
        case 'error': {
          if (settled) break
          clearTimeout(timeoutId)
          settled = true
          es.close()
          const msg = (data.message as string) || '后端处理出错'
          console.error('[Hound] SSE error event:', msg)
          handlers.onError?.(msg)
          reject(new Error(msg))
          break
        }
      }
    }

    // onerror fires when connection fails or server closes without 'done'
    es.onerror = (e) => {
      if (settled) return
      clearTimeout(timeoutId)
      settled = true
      es.close()
      const msg = `连接后端失败。当前 API_BASE: ${API_BASE}。请确认：① Vercel 已设置 NEXT_PUBLIC_API_URL 环境变量 ② Railway 服务正在运行`
      console.error('[Hound] SSE onerror:', e, 'url:', url)
      handlers.onError?.(msg)
      reject(new Error(msg))
    }
  })
}

// ─── Competitive analysis ────────────────────────────────────────────────────
export interface StreamOptions {
  lang?: string
  onStep: (step: ProgressStep) => void
  onAnimationState: (state: AnimationState) => void
  onReport: (report: Report) => void
  onError?: (msg: string) => void
  onDimensions?: (names: string[]) => void
  onDimDone?: (name: string, snippet?: string) => void
  onToken?: (content: string) => void
}

export async function generateCompetitiveReport(
  query: string,
  opts: StreamOptions,
): Promise<void> {
  const url = `${API_BASE}/api/competitive/stream?query=${encodeURIComponent(query)}&lang=${opts.lang ?? 'zh'}`
  return listenSse(url, opts)
}

// ─── Market sizing ────────────────────────────────────────────────────────────
export interface MarketSizingOptions {
  lang?: string
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
  for (let round = 0; round < 3; round++) {
    opts.onAnimationState('thinking')

    const collectUrl = `${API_BASE}/api/market-sizing/collect`
    console.log(`[Hound] collect round ${round + 1}:`, collectUrl)

    let res: { ready: boolean; summary?: string; question?: string }
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30_000)
      const response = await fetch(collectUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: initialInput, history, lang: opts.lang ?? 'zh' }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      if (!response.ok) {
        throw new Error(`后端返回 HTTP ${response.status}`)
      }
      res = await response.json()
      console.log('[Hound] collect response:', res)
    } catch (e: unknown) {
      const msg = e instanceof Error
        ? (e.name === 'AbortError' ? '信息收集请求超时（30s）' : `信息收集失败：${e.message}`)
        : '信息收集失败：网络错误'
      console.error('[Hound] collect error:', e)
      opts.onError?.(`${msg}。当前 API_BASE: ${API_BASE}`)
      throw e
    }

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
  const url = `${API_BASE}/api/market-sizing/stream?company_info=${encodeURIComponent(companyInfo)}&lang=${opts.lang ?? 'zh'}`
  return listenSse(url, opts)
}

// ─── Follow-up chat ───────────────────────────────────────────────────────────
export async function followUpChat(query: string, report: string, lang = 'zh'): Promise<string> {
  console.log('[Hound] followUpChat:', query.slice(0, 30))
  const res = await fetch(`${API_BASE}/api/followup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, report, lang }),
  })
  if (!res.ok) throw new Error(`followup HTTP ${res.status}`)
  const data = await res.json()
  return data.answer as string
}
