'use client'

import { useEffect, useState } from 'react'
import BorderCollie from '@/components/animations/BorderCollie'
import type { AnimationState } from '@/lib/types'

interface Props {
  status: string
  animationState: AnimationState
}

const STATUS_PROGRESS: Record<string, number> = {
  '正在规划研究维度...': 15,
  '正在检索知识库...': 38,
  '正在分析信息充分度...': 20,
  '收集信息中（第1轮）...': 30,
  '收集信息中（第2轮）...': 40,
  '正在检索类似案例...': 50,
  '正在生成报告...': 68,
  '正在生成测算报告...': 68,
  '正在审核报告质量...': 88,
}

export default function ProgressBar({ status, animationState }: Props) {
  const [progress, setProgress] = useState(0)
  const target = STATUS_PROGRESS[status] ?? 50

  useEffect(() => {
    const timer = setTimeout(() => setProgress(target), 60)
    return () => clearTimeout(timer)
  }, [target])

  return (
    <div className="flex flex-col items-center gap-6 py-10 animate-fade-in">
      {/* Dog animation */}
      <BorderCollie state={animationState} size={150} />

      {/* Status label */}
      <div className="flex items-center gap-2 text-sm font-inter text-ink-black">
        <span>{status}</span>
        <span className="flex gap-1 items-end h-3">
          <span className="w-1 h-1 rounded-full bg-ink-green animate-dots-1" />
          <span className="w-1 h-1 rounded-full bg-ink-green animate-dots-2" />
          <span className="w-1 h-1 rounded-full bg-ink-green animate-dots-3" />
        </span>
      </div>

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
