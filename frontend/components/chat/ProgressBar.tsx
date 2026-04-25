'use client'

import { useEffect, useState } from 'react'
import BorderCollie from '@/components/animations/BorderCollie'
import type { AnimationState } from '@/lib/types'
import { useLanguage } from '@/lib/i18n'

export interface DimensionItem {
  name: string
  status: 'active' | 'done'
  snippet?: string
}

interface Props {
  status: string
  animationState: AnimationState
  dimensions?: DimensionItem[]
}

const STATUS_PROGRESS: Record<string, number> = {
  // zh
  '正在规划研究维度...': 10,
  '正在并行检索': 30,      // prefix match via fallback
  '正在生成报告...': 65,
  '正在审核报告质量...': 85,
  '正在分析信息充分度...': 20,
  '收集信息中（第1轮）...': 30,
  '收集信息中（第2轮）...': 40,
  '正在检索类似案例...': 50,
  '正在联网搜索行业数据...': 60,
  '正在生成测算报告...': 68,
  // en
  'Planning research dimensions...': 10,
  'Retrieving': 30,          // prefix match via fallback
  'Generating report...': 65,
  'Reviewing report quality...': 85,
  'Analyzing information sufficiency...': 20,
  'Collecting info (round 1)...': 30,
  'Collecting info (round 2)...': 40,
  'Retrieving similar cases...': 50,
  'Searching web for industry data...': 60,
  'Generating sizing report...': 68,
}

function getProgress(status: string): number {
  if (STATUS_PROGRESS[status] !== undefined) return STATUS_PROGRESS[status]
  // prefix fallback for dynamic labels like "正在并行检索 5 个维度..." / "Retrieving 5 dimensions..."
  const match = Object.keys(STATUS_PROGRESS).find(k => status.startsWith(k))
  return match ? STATUS_PROGRESS[match] : 50
}

export default function ProgressBar({ status, animationState, dimensions }: Props) {
  const [progress, setProgress] = useState(0)
  const { t } = useLanguage()
  const [showCard, setShowCard] = useState(false)
  const [cardIndex, setCardIndex] = useState(0)
  const [cardVisible, setCardVisible] = useState(false)
  const cards = t.tipCards as readonly string[]

  // When dimensions are present, let done-count drive the progress in the 30-60% range
  const dimProgress = dimensions && dimensions.length > 0
    ? 30 + Math.round((dimensions.filter(d => d.status === 'done').length / dimensions.length) * 25)
    : null

  const target = dimProgress ?? getProgress(status)

  useEffect(() => {
    const timer = setTimeout(() => setProgress(target), 60)
    return () => clearTimeout(timer)
  }, [target])

  // Show tip cards after 10s; cycle every 10s with fade
  useEffect(() => {
    let fadeIn: ReturnType<typeof setTimeout>
    const show = setTimeout(() => {
      setShowCard(true)
      fadeIn = setTimeout(() => setCardVisible(true), 50)
    }, 10000)
    return () => {
      clearTimeout(show)
      clearTimeout(fadeIn)
    }
  }, [])

  useEffect(() => {
    if (!showCard) return
    const cycle = setInterval(() => {
      setCardVisible(false)
      setTimeout(() => {
        setCardIndex(i => (i + 1) % cards.length)
        setCardVisible(true)
      }, 500)
    }, 10000)
    return () => clearInterval(cycle)
  }, [showCard, cards.length])

  return (
    <div className="flex flex-col items-center gap-5 py-10 animate-fade-in">
      {/* Dog animation */}
      <BorderCollie state={animationState} size={150} />

      {/* Status label */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-2 text-sm font-inter text-ink-black">
          <span>{status}</span>
          <span className="flex gap-1 items-end h-3">
            <span className="w-1 h-1 rounded-full bg-ink-green animate-dots-1" />
            <span className="w-1 h-1 rounded-full bg-ink-green animate-dots-2" />
            <span className="w-1 h-1 rounded-full bg-ink-green animate-dots-3" />
          </span>
        </div>
        {status === t.progressGenerating && (
          <p className="text-xs font-inter text-ink-green/70">
            {t.progressGenHint}
          </p>
        )}
      </div>

      {/* Dimension chips + snippet log — only shown during retrieval */}
      {dimensions && dimensions.length > 0 && (
        <div className="flex flex-col items-center gap-3 w-full max-w-sm">
          {/* Chips row */}
          <div className="flex flex-wrap justify-center gap-2">
            {dimensions.map(d => (
              <span
                key={d.name}
                className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-inter border transition-all duration-500 ${
                  d.status === 'done'
                    ? 'bg-ink-green/10 text-ink-green border-ink-green/25'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {d.status === 'done' ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
                )}
                {d.name}
              </span>
            ))}
          </div>

          {/* Completed count */}
          <p className="text-[11px] font-inter text-mid-gray">
            {t.progressDimCount(dimensions.filter(d => d.status === 'done').length, dimensions.length)}
          </p>

          {/* Snippet feed — appears as dims complete */}
          {dimensions.some(d => d.snippet) && (
            <div className="w-full space-y-1 text-left">
              {dimensions.filter(d => d.snippet).map(d => (
                <p key={d.name} className="text-[11px] font-inter text-mid-gray leading-relaxed animate-fade-in">
                  <span className="text-ink-green font-medium">✓ {d.name}</span>
                  <span className="text-border-gray mx-1">→</span>
                  {d.snippet}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Progress track */}
      <div className="w-56 h-0.5 bg-border-gray rounded-full overflow-hidden">
        <div
          className="h-full bg-ink-green rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Rotating tip cards — appear after 10s */}
      {showCard && (
        <div
          className="max-w-[520px] w-full border border-ink-green/30 rounded-lg bg-cream px-5 py-5 text-center text-sm text-ink-black leading-relaxed"
          style={{ opacity: cardVisible ? 1 : 0, transition: 'opacity 0.5s ease' }}
        >
          {cards[cardIndex]}
        </div>
      )}
    </div>
  )
}
