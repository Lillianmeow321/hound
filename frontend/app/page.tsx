'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Sidebar from '@/components/layout/Sidebar'
import InputArea from '@/components/chat/InputArea'
import ProgressBar, { type DimensionItem } from '@/components/chat/ProgressBar'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import ReportView from '@/components/report/ReportView'
import BorderCollie from '@/components/animations/BorderCollie'
import { generateCompetitiveReport, followUpChat } from '@/lib/api'
import type { Report, Conversation, AnimationState, ProgressStep } from '@/lib/types'
import { useLanguage } from '@/lib/i18n'

type Phase = 'idle' | 'loading' | 'done'
const STORAGE_KEY = 'hound-conv-competitive'

const RESEARCH_KEYWORDS = [
  'AI','行业','市场','产品','公司','赛道','竞争','分析','研究','格局','趋势','投资','融资',
  '商业','用户','技术','平台','应用','创业','估值','增长','出海','SaaS','B端','C端',
  '供应链','消费','医疗','教育','金融','能源','汽车','硬件','软件','机器人','大模型',
  'agent','陪伴','情感','电商','游戏','内容','社交','直播','二手','戒指',
  'VR','AR','IoT','ESG','IPO','VC','PE','估值','营收','GMV','DAU','MAU',
  '充电','无人','机器','医疗','健康','美容','养老','宠物','农业','物流',
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
  // Only positive-match known chitchat patterns; don't block by length alone
  return CHITCHAT_PATTERNS.some(p => p.test(t))
}

export default function CompetitivePage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const { t, lang } = useLanguage()

  useEffect(() => {
    if (!localStorage.getItem('hound-seen-landing')) {
      router.replace('/landing')
    } else {
      setReady(true)
    }
  }, [router])

  const [mobileSidebar, setMobileSidebar] = useState(false)
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [progressStep, setProgressStep] = useState<ProgressStep>({ label: '', status: 'active' })
  const [animState, setAnimState] = useState<AnimationState>('idle')
  const [report, setReport] = useState<Report | null>(null)
  const [currentQuery, setCurrentQuery] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [dimensions, setDimensions] = useState<DimensionItem[]>([])
  const [streamingContent, setStreamingContent] = useState('')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([])
  const [isFollowupLoading, setIsFollowupLoading] = useState(false)

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
    if (!input.trim() || phase === 'loading' || isFollowupLoading) return
    const query = input.trim()
    setInput('')
    setErrorMsg('')
    console.log('[Hound] handleSubmit:', query)

    /* Follow-up on existing report — inline loading only, no full-page state change */
    if (report) {
      console.log('[Hound] mode: followup')
      setChatHistory(h => [...h, { role: 'user', content: query }])
      setIsFollowupLoading(true)
      try {
        const answer = await followUpChat(query, report.content, lang)
        setChatHistory(h => [...h, { role: 'assistant', content: answer }])
      } catch (e) {
        console.error('[Hound] followup error:', e)
        setErrorMsg(`${lang === 'en' ? 'Follow-up failed: ' : '追问失败：'}${e instanceof Error ? e.message : (lang === 'en' ? 'Unknown error' : '未知错误')}`)
      } finally {
        setIsFollowupLoading(false)
      }
      return
    }

    /* Chitchat guard */
    if (isChitchat(query)) {
      console.log('[Hound] mode: chitchat')
      setChatHistory(h => [...h, { role: 'user', content: query }, { role: 'assistant', content: randomChitchatReply() }])
      return
    }

    /* New report */
    console.log('[Hound] mode: new_report, calling API...')
    setCurrentQuery(query)
    setPhase('loading')
    setReport(null)
    setChatHistory([])
    setDimensions([])
    setStreamingContent('')
    setAnimState('idle')

    await generateCompetitiveReport(query, {
      lang,
      onStep: step => {
        console.log('[Hound] step:', step.label)
        setProgressStep(step)
        // Clear dimension chips once we move past retrieval
        if (!step.label.includes('检索') && !step.label.toLowerCase().includes('retriev')) setDimensions([])
      },
      onAnimationState: s => setAnimState(s),
      onDimensions: names => {
        setDimensions(names.map(name => ({ name, status: 'active' })))
      },
      onDimDone: (name, snippet) => {
        setDimensions(prev => prev.map(d => d.name === name ? { ...d, status: 'done', snippet } : d))
      },
      onToken: content => {
        setStreamingContent(prev => prev + content)
      },
      onReport: r => {
        console.log('[Hound] report received')
        setStreamingContent('')
        setReport(r)
        setPhase('done')
        setAnimState('idle')
        const conv: Conversation = {
          id: Date.now().toString(),
          title: query.length > 32 ? query.slice(0, 32) + '...' : query,
          mode: 'competitive',
          query,
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
        setErrorMsg(msg)
      },
    }).catch((e) => {
      console.error('[Hound] generateCompetitiveReport threw:', e)
      setPhase('idle')
      setAnimState('idle')
      if (!errorMsg) {
        setErrorMsg(e?.message || (lang === 'en' ? 'Connection failed. Check if the server is running.' : '连接后端失败，请检查服务是否运行'))
      }
    })
  }

  function handleNewAnalysis() {
    setReport(null)
    setPhase('idle')
    setCurrentQuery('')
    setChatHistory([])
    setActiveId(null)
    setInput('')
    setErrorMsg('')
    setDimensions([])
    setStreamingContent('')
  }

  function handleSelectConversation(conv: Conversation) {
    setCurrentQuery(conv.query)
    setReport(conv.report ?? null)
    setPhase(conv.report ? 'done' : 'idle')
    setActiveId(conv.id)
    setChatHistory([])
    setInput('')
    setErrorMsg('')
    setDimensions([])
    setStreamingContent('')
  }

  function handleExport() {
    if (!report) return
    const blob = new Blob([report.content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hound-${currentQuery.slice(0, 20).replace(/\s/g, '-')}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!ready) return <div className="min-h-screen bg-cream" />

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
            <div className="max-w-3xl mx-auto px-4 md:px-6 pt-6 md:pt-8 pb-32">
              {phase === 'idle' && !report && chatHistory.length === 0 && !errorMsg && <EmptyState />}

              {/* Error banner */}
              {errorMsg && (
                <div className="animate-fade-in mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-inter leading-relaxed">
                  <span className="font-medium">{t.errorPrefix}</span>{errorMsg}
                </div>
              )}

              {phase === 'loading' && (
                <>
                  {currentQuery && (
                    <div className="flex justify-end mb-6 animate-fade-in">
                      <div className="bg-ink-green/[0.07] border border-ink-green/15 rounded-2xl rounded-tr-sm px-4 py-3 text-sm font-inter text-ink-black max-w-lg">
                        {currentQuery}
                      </div>
                    </div>
                  )}
                  {streamingContent ? (
                    <div className="space-y-4">
                      {/* Compact status bar while streaming */}
                      <div className="flex items-center gap-2 text-xs font-inter text-mid-gray">
                        <span className="flex gap-1 items-end h-3">
                          <span className="w-1 h-1 rounded-full bg-ink-green animate-dots-1" />
                          <span className="w-1 h-1 rounded-full bg-ink-green animate-dots-2" />
                          <span className="w-1 h-1 rounded-full bg-ink-green animate-dots-3" />
                        </span>
                        <span>{progressStep.label}</span>
                      </div>
                      {/* Streaming report content */}
                      <div className="prose-report animate-fade-in">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}
                          components={{
                            table: ({ children, ...props }) => (
                              <div className="overflow-x-auto -mx-1">
                                <table {...props}>{children}</table>
                              </div>
                            ),
                          }}
                        >
                          {streamingContent}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    <ProgressBar status={progressStep.label} animationState={animState} dimensions={dimensions.length > 0 ? dimensions : undefined} />
                  )}
                </>
              )}
              {phase === 'done' && report && (
                <ReportView report={report} query={currentQuery} onExport={handleExport} onNewAnalysis={handleNewAnalysis} />
              )}
              {(chatHistory.length > 0 || isFollowupLoading) && (
                <div className="mt-8 space-y-4 border-t border-border-gray pt-6">
                  {report && (
                    <p className="text-[11px] text-mid-gray uppercase tracking-widest font-inter">
                      {t.followupLabel}
                    </p>
                  )}
                  {chatHistory.map((m, i) => (
                    <div key={i} className={`animate-fade-in ${m.role === 'user' ? 'flex justify-end' : ''}`}>
                      {m.role === 'user' ? (
                        <div className="bg-ink-green/[0.07] border border-ink-green/15 rounded-2xl rounded-tr-sm
                          px-4 py-3 text-sm font-inter text-ink-black max-w-lg">
                          {m.content}
                        </div>
                      ) : (
                        <div className="prose-report text-sm leading-relaxed">{m.content}</div>
                      )}
                    </div>
                  ))}
                  {isFollowupLoading && (
                    <div className="animate-fade-in flex items-center gap-2 py-1">
                      <span className="flex gap-1 items-end h-4">
                        <span className="w-1.5 h-1.5 rounded-full bg-ink-green animate-dots-1" />
                        <span className="w-1.5 h-1.5 rounded-full bg-ink-green animate-dots-2" />
                        <span className="w-1.5 h-1.5 rounded-full bg-ink-green animate-dots-3" />
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Fixed input dock */}
          <div className="border-t border-border-gray bg-cream/95 backdrop-blur-sm px-4 md:px-6 py-3 md:py-4">
            <div className="max-w-3xl mx-auto">
              <InputArea
                value={input}
                onChange={setInput}
                onSubmit={handleSubmit}
                disabled={phase === 'loading' || isFollowupLoading}
                placeholder={report ? t.inputPlaceholderFollowup : t.inputPlaceholderNew}
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
      <BorderCollie state="idle" size={130} variant="competitive" />
      <div className="text-center space-y-3">
        <h2 className="font-playfair text-2xl font-medium text-ink-black">{t.researchTitle}</h2>
        <p className="text-base font-semibold text-ink-green font-inter">
          {t.researchSlogan}
        </p>
        <p className="text-sm text-mid-gray font-inter max-w-sm leading-relaxed whitespace-pre-line">
          {t.researchDesc}
        </p>
      </div>
    </div>
  )
}
