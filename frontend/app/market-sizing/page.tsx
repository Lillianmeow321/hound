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
import { useLanguage } from '@/lib/i18n'

type Phase = 'idle' | 'collecting' | 'loading' | 'done'

type LogEntry = { role: 'user' | 'hound'; content: string }

const STORAGE_KEY = 'hound-conv-market'

const RESEARCH_KEYWORDS = [
  'AI','行业','市场','产品','公司','赛道','竞争','分析','研究','格局','趋势','投资','融资',
  '商业','用户','技术','平台','应用','创业','估值','增长','出海','SaaS','B端','C端',
  '供应链','消费','医疗','教育','金融','能源','汽车','硬件','软件','机器人','大模型',
  'agent','陪伴','情感','电商','游戏','内容','社交','直播','测算','规模','二手','戒指',
  'VR','AR','IoT','ESG','IPO','VC','PE','估值','营收','GMV','DAU','MAU',
  '充电','无人','机器','健康','美容','养老','宠物','农业','物流',
]

// Only known greetings/reactions are chitchat — never block short industry terms
const CHITCHAT_PATTERNS = [
  /^[你您]好[啊呀！!]?$/,
  /^谢谢[你您啊呀！!]?$/,
  /^感谢[你您]?[！!]?$/,
  /^[嗯哦哈]{1,5}[啊呀！!。.]*$/,
  /^[哈]{2,}[哈！!]*$/,
  /^棒[极了]?[！!]?$/,
  /^[赞棒好][！!]*$/,
  /^厉害[了！!]?$/,
  /^不错[！!]?$/,
  /^(hi|hello|hey|thanks|thank you)[!.?]?$/i,
]

function isChitchat(text: string): boolean {
  const t = text.trim()
  if (!t) return true
  if (t.length >= 10) return false
  if (RESEARCH_KEYWORDS.some(kw => t.toLowerCase().includes(kw.toLowerCase()))) return false
  if (/[a-zA-Z]{3,}/.test(t) && !CHITCHAT_PATTERNS.some(p => p.test(t))) return false
  return CHITCHAT_PATTERNS.some(p => p.test(t))
}

export default function MarketSizingPage() {
  const { t, lang } = useLanguage()
  const [mobileSidebar, setMobileSidebar] = useState(false)
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [progressStep, setProgressStep] = useState<ProgressStep>({ label: '', status: 'active' })
  const [animState, setAnimState] = useState<AnimationState>('idle')
  const [report, setReport] = useState<Report | null>(null)
  const [currentQuery, setCurrentQuery] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  // Active (unanswered) follow-up question shown as bubble
  const [currentFollowUp, setCurrentFollowUp] = useState<FollowUpQuestion | null>(null)
  // Completed exchanges shown as chat history above the active bubble
  const [chatLog, setChatLog] = useState<LogEntry[]>([])

  // Resolver that the API awaits — called when user submits their answer
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

  function randomChitchatReply(): string {
    return (t.chitchat as readonly string[])[Math.floor(Math.random() * t.chitchat.length)]
  }

  async function handleSubmit() {
    if (!input.trim()) return
    const value = input.trim()
    setInput('')
    console.log('[Hound] market handleSubmit:', value)

    // If the API is waiting for a follow-up answer, resolve the promise
    if (answerResolverRef.current) {
      console.log('[Hound] resolving follow-up answer')
      setCurrentFollowUp(null)
      answerResolverRef.current(value)
      answerResolverRef.current = null
      return
    }

    // Ignore submit if already loading and NOT waiting for a follow-up
    if (phase === 'loading' || phase === 'collecting') return

    // Chitchat guard
    if (isChitchat(value)) {
      console.log('[Hound] mode: chitchat')
      setChatLog([{ role: 'user', content: value }, { role: 'hound', content: randomChitchatReply() }])
      return
    }

    // Start new analysis
    console.log('[Hound] mode: new market analysis, calling API...')
    setCurrentQuery(value)
    setPhase('collecting')
    setReport(null)
    setErrorMsg('')
    setChatLog([{ role: 'user', content: value }])
    setAnimState('thinking')

    await generateMarketSizingReport(value, {
      lang,
      onFollowUp: (q: FollowUpQuestion) =>
        new Promise<string>(resolve => {
          console.log('[Hound] follow-up question:', q.question)
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
        console.log('[Hound] step:', step.label)
        setProgressStep(step)
        setPhase('loading')
        setCurrentFollowUp(null)
      },

      onAnimationState: (s: AnimationState) => setAnimState(s),

      onReport: (r: Report) => {
        console.log('[Hound] report received')
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

      onError: (msg) => {
        console.error('[Hound] API error:', msg)
        setPhase('idle')
        setAnimState('idle')
        setCurrentFollowUp(null)
        answerResolverRef.current = null
        setErrorMsg(msg)
      },
    }).catch((e) => {
      console.error('[Hound] generateMarketSizingReport threw:', e)
      setPhase('idle')
      setAnimState('idle')
      setCurrentFollowUp(null)
      answerResolverRef.current = null
      if (!errorMsg) {
        setErrorMsg(e?.message || (lang === 'en' ? 'Connection failed. Check if the server is running.' : '连接后端失败，请检查服务是否运行'))
      }
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
    setErrorMsg('')
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
    ? t.sizingInputAnswer
    : phase === 'idle' || phase === 'done'
    ? t.sizingInputNew
    : t.sizingInputWaiting

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar onMenuClick={() => setMobileSidebar(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={handleSelectConversation}
          mobileOpen={mobileSidebar}
          onMobileClose={() => setMobileSidebar(false)}
        />

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 md:px-6 pt-6 md:pt-8 pb-32 space-y-4">

              {phase === 'idle' && !report && chatLog.length === 0 && !errorMsg && <EmptyState />}

              {/* Error banner */}
              {errorMsg && (
                <div className="animate-fade-in rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-inter leading-relaxed">
                  <span className="font-medium">{t.errorPrefix}</span>{errorMsg}
                </div>
              )}

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

          <div className="border-t border-border-gray bg-cream/95 backdrop-blur-sm px-4 md:px-6 py-3 md:py-4">
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
  const { t } = useLanguage()
  return (
    <div className="flex flex-col items-center justify-center min-h-[58vh] gap-8 select-none">
      <BorderCollie state="idle" size={130} variant="market" />
      <div className="text-center space-y-2.5">
        <h2 className="font-playfair text-2xl font-medium text-ink-black">{t.sizingTitle}</h2>
        <p className="text-sm text-mid-gray font-inter max-w-sm leading-relaxed whitespace-pre-line">
          {t.sizingDesc}
        </p>
      </div>
    </div>
  )
}
