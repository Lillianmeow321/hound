'use client'

import { useState } from 'react'
import type { Conversation } from '@/lib/types'

interface Props {
  conversations: Conversation[]
  activeId: string | null
  onSelect: (conv: Conversation) => void
}

export default function Sidebar({ conversations, activeId, onSelect }: Props) {
  const [open, setOpen] = useState(true)

  return (
    <aside
      className={`flex-shrink-0 border-r border-border-gray bg-cream transition-all duration-300 flex flex-col ${
        open ? 'w-60' : 'w-10'
      }`}
    >
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="h-10 flex items-center justify-center hover:bg-border-gray/40 transition-colors group"
        title={open ? '收起' : '展开历史'}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
          className={`transition-transform duration-300 ${open ? '' : 'rotate-180'}`}>
          <path d="M10 4 L6 8 L10 12" stroke="#888880" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <p className="text-[10px] text-mid-gray font-inter uppercase tracking-widest mb-3 mt-1 px-1">
            历史记录
          </p>

          {conversations.length === 0 && (
            <div className="text-xs text-mid-gray px-1 py-4 text-center leading-relaxed">
              还没有历史对话
            </div>
          )}

          <div className="flex flex-col gap-1">
            {conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => onSelect(conv)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-inter leading-snug transition-all duration-150 group ${
                  activeId === conv.id
                    ? 'bg-ink-green/10 text-ink-black border border-ink-green/20'
                    : 'hover:bg-border-gray/50 text-ink-black'
                }`}
              >
                {/* Mode badge */}
                <span className={`inline-block text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded mb-1 ${
                  conv.mode === 'competitive'
                    ? 'bg-ink-green/10 text-ink-green'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {conv.mode === 'competitive' ? '竞品' : '市场'}
                </span>
                <div className="truncate font-medium">{conv.title}</div>
                <div className="text-mid-gray text-[10px] mt-0.5">
                  {formatDate(conv.createdAt)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}

function formatDate(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}小时前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}
