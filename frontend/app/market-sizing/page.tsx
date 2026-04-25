'use client'

import { useState, useEffect, useRef } from 'react'
import Navbar from '@/components/layout/Navbar'
import Sidebar from '@/components/layout/Sidebar'
import InputArea from '@/components/chat/InputArea'
import FollowUpBubble from '@/components/chat/FollowUpBubble'
import ProgressBar from '@/components/chat/ProgressBar'
import ReportView from '@/components/report/ReportView'
import BorderCollie from '@/components/animations/BorderCollie'
import { generateMarketSizingReport } from '@/lib/api'
import type {
  Report, Conversation, AnimationState, ProgressStep, FollowUpQuestion,
} from '@/lib/types'

type Phase = 'idle' | 'collecting' | 'loading' | 'done'

type LogEntry = { role: 'user' | 'hound'; content: string }

const STORAGE_KEY = 'hound-conv-market'

const RESEARCH_KEYWORDS = [
  'AI','行业','市场','产品','公司','赛道','竞争','分析','研究','格局','趋势','投资','融资',
  '商业','用户','技术','平台','应用','创业','估值','增长','出海','SaaS','B端','C端',
  '供应链','消费','医疗','教育','金融','能源','汽车','硬件','软件','机器人','大模型',
  'agent','陪伴','情感','电商','游戏','内容','社交','直播','测算','规模',
]
const CHITCHAT_REPLIES = [
  '你好你好！汪！🐾',
  '谢谢你，你真好！尾巴摇摆中...🐕',
  '你也好！你也好！汪汪！',
  '好开心见到你！我们开始研究吧？🐾',
  '汪！收到！有什么研究方向可以告诉我～',
]

function isChitchat(text: string): boolean {
  if (text.length > 15) return false
  if (RESEARCH_KEYWORDS.some(kw => text.toLowerCase().includes(kw.toLowerCase()))) return false
  if (/[a-zA-Z]{3,}/.test(text)) return false
  return true
}

function randomChitchatReply(): string {
  return CHITCHAT_REPLIES[Math.floor(Math.random() * CHITCHAT_REPLIES.length)]
}

export default function MarketSizingPage() {
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [progressStep, setProgressStep] = useState<ProgressStep>({ label: '', status: 'active' })
  const [animState, setAnimState] = useState<AnimationState>('idle')
  const [report, setReport] = useState<Report | null>(null)
  const [currentQuery, setCurrentQuery] = useState('')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  // Active (unanswered) follow-up question shown as bubble
  const [currentFollowUp, setCurrentFollowUp] = useState<FollowUpQuestion | null>(null)
  // Completed exchanges shown as chat history above the active bubble
  const [chatLog, setChatLog] = useState<LogEntry[]>([])

  // Resolver that the mock API awaits — called when user submits their answer
  const answerResolverRef = useRef<((answer: string) => void) | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Array<Omit<Conversation, 'createdAt'> & { createdAt: string }>
        setConversations(parsed.map(c => ({ ...c, createdAt: new Date(c.createdAt) })))
      }
    } catch {}
  }, [])

  function saveConversation(conv: Conversation) {
    setConversations(prev => {
      const next = [conv, ...prev.filter(c => c.id !== conv.id)].slice(0, 30)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  async function handleSubmit() {
    if (!input.trim()) return
    const value = input.trim()
    setInput('')

    // If the mock API is waiting for a follow-up answer, resolve the promise
    if (answerResolverRef.current) {
      setCurrentFollowUp(null)
      answerResolverRef.current(value)
      answerResolverRef.current = null
      return
    }

    // Ignore submit if already loading and NOT waiting for a follow-up
    if (phase === 'loading' || phase === 'collecting') return

    // Chitchat guard
    if (isChitchat(value)) {
      setChatLog([{ role: 'user', content: value }, { role: 'hound', content: randomChitchatReply() }])
      setPhase('idle')
      return
    }

    // Start new analysis
    setCurrentQuery(value)
    setPhase('collecting')
    setReport(null)
    setChatLog([{ role: 'user', content: value }])
    setAnimState('thinking')

    await generateMarketSizingReport(value, {
      onFollowUp: (q: FollowUpQuestion) =>
        new Promise<string>(resolve => {
          setCurrentFollowUp(q)
          setPhase('collecting')
          answerResolverRef.current = (answer: string) => {
            setChatLog(log => [
              ...log,
              { role: 'hound', content: q.question },
              { role: 'user', content: answer },
            ])
            resolve(answer)
          }
        }),

      onStep: (step: ProgressStep) => {
        setProgressStep(step)
        setPhase('loading')
        setCurrentFollowUp(null)
      },

      onAnimationState: (s: AnimationState) => setAnimState(s),

      onReport: (r: Report) => {
        setReport(r)
        setPhase('done')
        setAnimState('idle')
        const conv: Conversation = {
          id: Date.now().toString(),
          title: value.length > 32 ? value.slice(0, 32) + '...' : value,
          mode: 'market-sizing',
          query: value,
          report: r,
          createdAt: new Date(),
        }
        setActiveId(conv.id)
        saveConversation(conv)
      },

      onError: () => {
        setPhase('idle')
        setAnimState('idle')
        setCurrentFollowUp(null)
        answerResolverRef.current = null
      },
    }).catch(() => {
      setPhase('idle')
      setAnimState('idle')
      setCurrentFollowUp(null)
      answerResolverRef.current = null
    })
  }

  function handleSelectConversation(conv: Conversation) {
    setCurrentQuery(conv.query)
    setReport(conv.report ?? null)
    setPhase(conv.report ? 'done' : 'idle')
    setActiveId(conv.id)
    setChatLog([])
    setCurrentFollowUp(null)
    answerResolverRef.current = null
    setInput('')
  }

  function handleExport() {
    if (!report) return
    const blob = new Blob([report.content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hound-sizing-${currentQuery.slice(0, 20).replace(/\s/g, '-')}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Input is enabled when: idle, done, or waiting for follow-up answer
  const inputDisabled = (phase === 'loading') || (phase === 'collecting' && !answerResolverRef.current)
  const inputPlaceholder = currentFollowUp
    ? '在这里回答上面的问题...'
    : phase === 'idle' || phase === 'done'
    ? '描述这家公司，几句话即可🐶'
    : '等待处理中...'

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={handleSelectConversation}
        />

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 pt-8 pb-32 space-y-4">

              {phase === 'idle' && !report && <EmptyState />}

              {/* Completed Q&A history */}
              {chatLog.length > 0 && (
                <div className="space-y-3">
                  {chatLog.map((m, i) => (
                    <div key={i} className={`animate-fade-in ${m.role === 'user' ? 'flex justify-end' : ''}`}>
                      {m.role === 'user' ? (
                        <div className="bg-ink-green/[0.07] border border-ink-green/15 rounded-2xl
                          rounded-tr-sm px-4 py-3 text-sm font-inter text-ink-black max-w-lg">
                          {m.content}
                        </div>
                      ) : (
                        <div className="flex gap-3 items-start max-w-xl">
                          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-ink-green/10
                            border border-ink-green/20 flex items-center justify-center
                            text-[10px] font-inter text-ink-green font-medium mt-0.5">
                            H
                          </div>
                          <div className="bg-white border border-border-gray rounded-2xl
                            rounded-tl-sm px-4 py-3 shadow-sm">
                            <p className="text-[11px] text-ink-green font-medium mb-1 font-inter">Hound</p>
                            <p className="text-sm font-inter text-ink-black leading-relaxed">{m.content}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Active follow-up bubble (unanswered) */}
              {currentFollowUp && <FollowUpBubble followUp={currentFollowUp} />}

              {/* Loading progress */}
              {phase === 'loading' && (
                <ProgressBar status={progressStep.label} animationState={animState} />
              )}

              {/* Waiting for follow-up (between Q and input) */}
              {phase === 'collecting' && !currentFollowUp && (
                <div className="flex justify-center py-4">
                  <span className="flex gap-1 items-end h-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-green animate-dots-1" />
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-green animate-dots-2" />
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-green animate-dots-3" />
                  </span>
                </div>
              )}

              {phase === 'done' && report && (
                <ReportView report={report} query={currentQuery} onExport={handleExport} />
              )}
            </div>
          </div>

          <div className="border-t border-border-gray bg-cream/95 backdrop-blur-sm px-6 py-4">
            <div className="max-w-3xl mx-auto">
              <InputArea
                value={input}
                onChange={setInput}
                onSubmit={handleSubmit}
                disabled={inputDisabled}
                placeholder={inputPlaceholder}
                autoFocus
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[58vh] gap-8 select-none">
      <BorderCollie state="idle" size={130} variant="market" />
      <div className="text-center space-y-2.5">
        <h2 className="font-playfair text-2xl font-medium text-ink-black">市场规模测算</h2>
        <p className="text-sm text-mid-gray font-inter max-w-sm leading-relaxed">
          不知道怎么拍市场规模？边牧分析师来帮你。请描述公司/行业，小边牧将追问 2–3 个关键问题，然后输出市场测算。适配 VCer、consultant 和互联网从业者的颗粒度需求。
        </p>
      </div>
    </div>
  )
}
