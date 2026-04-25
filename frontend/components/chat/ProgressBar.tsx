'use client'

import { useEffect, useState } from 'react'
import BorderCollie from '@/components/animations/BorderCollie'
import type { AnimationState } from '@/lib/types'

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
  '正在规划研究维度...': 10,
  '正在并行检索': 30,      // prefix match via fallback
  '正在生成报告...': 65,
  '正在审核报告质量...': 85,
  '正在分析信息充分度...': 20,
  '收集信息中（第1轮）...': 30,
  '收集信息中（第2轮）...': 40,
  '正在检索类似案例...': 50,
  '正在生成测算报告...': 68,
}

function getProgress(status: string): number {
  if (STATUS_PROGRESS[status] !== undefined) return STATUS_PROGRESS[status]
  // prefix fallback for dynamic labels like "正在并行检索 5 个维度..."
  const match = Object.keys(STATUS_PROGRESS).find(k => status.startsWith(k))
  return match ? STATUS_PROGRESS[match] : 50
}

export default function ProgressBar({ status, animationState, dimensions }: Props) {
  const [progress, setProgress] = useState(0)

  // When dimensions are present, let done-count drive the progress in the 30-60% range
  const dimProgress = dimensions && dimensions.length > 0
    ? 30 + Math.round((dimensions.filter(d => d.status === 'done').length / dimensions.length) * 25)
    : null

  const target = dimProgress ?? getProgress(status)

  useEffect(() => {
    const timer = setTimeout(() => setProgress(target), 60)
    return () => clearTimeout(timer)
  }, [target])

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
        {status === '正在生成报告...' && (
          <p className="text-xs font-inter text-ink-green/70">
            多agent并行，第一次小边牧跑会有点慢，后面就好了！汪 🐕
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
            已完成 {dimensions.filter(d => d.status === 'done').length}/{dimensions.length} 个维度
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
    </div>
  )
}
