'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Sidebar from '@/components/layout/Sidebar'
import InputArea from '@/components/chat/InputArea'
import ProgressBar from '@/components/chat/ProgressBar'
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
  'agent','陪伴','情感','电商','游戏','内容','社交','直播',
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

  const [input, setInput] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [progressStep, setProgressStep] = useState<ProgressStep>({ label: '', status: 'active' })
  const [animState, setAnimState] = useState<AnimationState>('idle')
  const [report, setReport] = useState<Report | null>(null)
  const [currentQuery, setCurrentQuery] = useState('')
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

    /* Follow-up on existing report */
    if (report) {
      setPhase('loading')
      setProgressStep({ label: '正在检索知识库...', status: 'active' })
      setAnimState('running')
      const answer = await followUpChat(query, report.content)
      setChatHistory(h => [...h, { role: 'user', content: query }, { role: 'assistant', content: answer }])
      setPhase('done')
      setAnimState('idle')
      return
    }

    /* Chitchat guard */
    if (isChitchat(query)) {
      setChatHistory(h => [...h, { role: 'user', content: query }, { role: 'assistant', content: randomChitchatReply() }])
      setPhase('done')
      return
    }

    /* New report */
    setCurrentQuery(query)
    setPhase('loading')
    setReport(null)
    setChatHistory([])
    setAnimState('idle')

    await generateCompetitiveReport(query, {
      onStep: step => setProgressStep(step),
      onAnimationState: s => setAnimState(s),
      onReport: r => {
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
      onError: () => { setPhase('idle'); setAnimState('idle') },
    }).catch(() => { setPhase('idle'); setAnimState('idle') })
  }

  function handleSelectConversation(conv: Conversation) {
    setCurrentQuery(conv.query)
    setReport(conv.report ?? null)
    setPhase(conv.report ? 'done' : 'idle')
    setActiveId(conv.id)
    setChatHistory([])
    setInput('')
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
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={handleSelectConversation}
        />

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 pt-8 pb-32">
              {phase === 'idle' && !report && chatHistory.length === 0 && <EmptyState />}
              {phase === 'loading' && (
                <ProgressBar status={progressStep.label} animationState={animState} />
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
                        <div className="bg-ink-green/8 border border-ink-green/15 rounded-2xl rounded-tr-sm
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
          <div className="border-t border-border-gray bg-cream/95 backdrop-blur-sm px-6 py-4">
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
