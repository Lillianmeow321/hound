'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Sidebar from '@/components/layout/Sidebar'
import InputArea from '@/components/chat/InputArea'
import ProgressBar, { type DimensionItem } from '@/components/chat/ProgressBar'
import ReportView from '@/components/report/ReportView'
import BorderCollie from '@/components/animations/BorderCollie'
import { generateCompetitiveReport, followUpChat } from '@/lib/api'
import type { Report, Conversation, AnimationState, ProgressStep } from '@/lib/types'

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
]

function isChitchat(text: string): boolean {
  const t = text.trim()
  if (!t) return true
  if (t.length >= 10) return false
  if (RESEARCH_KEYWORDS.some(kw => t.toLowerCase().includes(kw.toLowerCase()))) return false
  if (/[a-zA-Z]{3,}/.test(t)) return false
  // Only positive-match known chitchat patterns; don't block by length alone
  return CHITCHAT_PATTERNS.some(p => p.test(t))
}

const CHITCHAT_REPLIES = [
  '你好你好！汪！🐾',
  '谢谢你，你真好！尾巴摇摆中...🐕',
  '你也好！你也好！汪汪！',
  '好开心见到你！我们开始研究吧？🐾',
  '汪！收到！有什么研究方向可以告诉我～',
]

function randomChitchatReply(): string {
  return CHITCHAT_REPLIES[Math.floor(Math.random() * CHITCHAT_REPLIES.length)]
}

export default function CompetitivePage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)

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
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([])

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
    if (!input.trim() || phase === 'loading') return
    const query = input.trim()
    setInput('')
    setErrorMsg('')
    console.log('[Hound] handleSubmit:', query)

    /* Follow-up on existing report */
    if (report) {
      console.log('[Hound] mode: followup')
      setPhase('loading')
      setProgressStep({ label: '正在检索知识库...', status: 'active' })
      setAnimState('running')
      try {
        const answer = await followUpChat(query, report.content)
        setChatHistory(h => [...h, { role: 'user', content: query }, { role: 'assistant', content: answer }])
      } catch (e) {
        console.error('[Hound] followup error:', e)
        setErrorMsg(`追问失败：${e instanceof Error ? e.message : '未知错误'}`)
      }
      setPhase('done')
      setAnimState('idle')
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
    setAnimState('idle')

    await generateCompetitiveReport(query, {
      onStep: step => {
        console.log('[Hound] step:', step.label)
        setProgressStep(step)
        // Clear dimension chips once we move past retrieval
        if (!step.label.includes('检索')) setDimensions([])
      },
      onAnimationState: s => setAnimState(s),
      onDimensions: names => {
        setDimensions(names.map(name => ({ name, status: 'active' })))
      },
      onDimDone: name => {
        setDimensions(prev => prev.map(d => d.name === name ? { ...d, status: 'done' } : d))
      },
      onReport: r => {
        console.log('[Hound] report received')
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
        setErrorMsg(e?.message || '连接后端失败，请检查服务是否运行')
      }
    })
  }

  function handleSelectConversation(conv: Conversation) {
    setCurrentQuery(conv.query)
    setReport(conv.report ?? null)
    setPhase(conv.report ? 'done' : 'idle')
    setActiveId(conv.id)
    setChatHistory([])
    setInput('')
    setErrorMsg('')
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
                  <span className="font-medium">连接出错：</span>{errorMsg}
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
                  <ProgressBar status={progressStep.label} animationState={animState} dimensions={dimensions.length > 0 ? dimensions : undefined} />
                </>
              )}
              {phase === 'done' && report && (
                <ReportView report={report} query={currentQuery} onExport={handleExport} />
              )}
              {chatHistory.length > 0 && (
                <div className="mt-8 space-y-4 border-t border-border-gray pt-6">
                  {report && (
                    <p className="text-[11px] text-mid-gray uppercase tracking-widest font-inter">
                      追问记录
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
                disabled={phase === 'loading'}
                placeholder={
                  report
                    ? '追问报告内容，或输入新赛道开始全新分析...'
                    : '输入研究方向，比如 AI情感陪伴 汪！'
                }
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
      <BorderCollie state="idle" size={130} variant="competitive" />
      <div className="text-center space-y-2.5">
        <h2 className="font-playfair text-2xl font-medium text-ink-black">投研分析</h2>
        <p className="text-sm text-mid-gray font-inter max-w-sm leading-relaxed">
          知识库来自一线沉淀数据，懂分析师的需求与痛点。<br />
          输入研究方向后，将结合知识库智慧与联网搜索，自动生成研究报告。
        </p>
      </div>
    </div>
  )
}
