'use client'

import { useState } from 'react'
import type { ReviewResult } from '@/lib/types'

interface Props {
  review: ReviewResult
}

export default function QualityScore({ review }: Props) {
  const [expanded, setExpanded] = useState(false)
  const score = review.score
  const pct = (score / 10) * 100

  const color = score >= 8 ? '#2d4a3e' : score >= 6 ? '#b5860d' : '#b54040'
  const label = score >= 8 ? '优秀' : score >= 6 ? '良好' : '待优化'

  return (
    <div className="border border-border-gray rounded-xl overflow-hidden animate-fade-in">
      <div className="flex items-center justify-between px-5 py-3.5">
        <div className="flex items-center gap-3">
          {/* Score ring */}
          <div className="relative w-10 h-10">
            <svg width="40" height="40" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="16" fill="none" stroke="#e0e0d8" strokeWidth="3" />
              <circle
                cx="20" cy="20" r="16" fill="none"
                stroke={color} strokeWidth="3"
                strokeDasharray={`${(pct / 100) * 100.5} 100.5`}
                strokeLinecap="round"
                transform="rotate(-90 20 20)"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-inter font-semibold"
              style={{ color }}>
              {score}
            </span>
          </div>

          <div>
            <div className="text-xs font-inter font-medium text-ink-black">
              质量评分 {score}/10 · <span style={{ color }}>{label}</span>
            </div>
            {review.pass && (
              <div className="text-[10px] text-mid-gray font-inter mt-0.5">
                报告已通过质量审核
              </div>
            )}
          </div>
        </div>

        {review.suggestions?.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[11px] text-mid-gray hover:text-ink-black transition-colors font-inter"
          >
            {expanded ? '收起' : '优化建议'}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
              className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
              <path d="M2.5 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      {expanded && review.suggestions?.length > 0 && (
        <div className="border-t border-border-gray/60 px-5 py-3.5 bg-white/40 animate-fade-in">
          <p className="text-[10px] text-mid-gray uppercase tracking-wider font-inter mb-2">
            可进一步优化的方向
          </p>
          <ul className="space-y-1.5">
            {review.suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-xs font-inter text-ink-black">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                  className="flex-shrink-0 mt-0.5">
                  <path d="M6 1l1.35 3.6L11 5.15l-3 2.55.9 3.8L6 9.55l-2.9 1.95.9-3.8L1 5.15l3.65-.55z"
                    stroke="#2d4a3e" strokeWidth="1" fill="rgba(45,74,62,0.08)" />
                </svg>
                <span className="leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
