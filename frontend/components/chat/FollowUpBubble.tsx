'use client'

import type { FollowUpQuestion } from '@/lib/types'

interface Props {
  followUp: FollowUpQuestion
}

export default function FollowUpBubble({ followUp }: Props) {
  const dots = Array.from({ length: followUp.totalRounds }, (_, i) => i + 1)

  return (
    <div className="flex flex-col gap-2 animate-slide-up">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-1">
        <div className="flex gap-1.5">
          {dots.map(d => (
            <div
              key={d}
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                d <= followUp.round ? 'bg-ink-green' : 'bg-border-gray'
              }`}
            />
          ))}
        </div>
        <span className="text-[11px] text-mid-gray font-inter">
          第 {followUp.round} 轮 / 共 {followUp.totalRounds} 轮
        </span>
      </div>

      {/* Bubble */}
      <div className="flex gap-3 items-start max-w-xl">
        {/* Hound avatar */}
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-ink-green/10 border border-ink-green/20
          flex items-center justify-center mt-0.5">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="#2d4a3e" strokeWidth="1.2" />
            <circle cx="8" cy="8" r="2" fill="#2d4a3e" opacity="0.5" />
          </svg>
        </div>

        <div className="flex-1 bg-white border border-border-gray rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
          <p className="text-[11px] text-ink-green font-medium mb-1 font-inter">Hound</p>
          <p className="text-sm font-inter text-ink-black leading-relaxed">
            {followUp.question}
          </p>
        </div>
      </div>
    </div>
  )
}
