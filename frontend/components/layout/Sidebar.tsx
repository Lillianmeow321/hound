'use client'

import { useState } from 'react'
import type { Conversation } from '@/lib/types'

interface Props {
  conversations: Conversation[]
  activeId: string | null
  onSelect: (conv: Conversation) => void
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  mobileOpen = false,
  onMobileClose,
}: Props) {
  const [open, setOpen] = useState(true)

  function handleSelect(conv: Conversation) {
    onSelect(conv)
    onMobileClose?.()
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`md:hidden fixed inset-0 bg-ink-black/20 z-40 transition-opacity duration-300 ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onMobileClose}
      />

      {/* Sidebar panel */}
      <aside
        className={[
          'flex flex-col bg-cream border-r border-border-gray',
          // Mobile: fixed drawer, slides from left
          'fixed inset-y-0 left-0 z-50 w-72 transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: static inline column, collapsible
          'md:static md:inset-y-auto md:left-auto md:z-auto md:translate-x-0 md:flex-shrink-0',
          open ? 'md:w-60' : 'md:w-10',
        ].join(' ')}
      >
        {/* Mobile header row (close button) */}
        <button
          className="md:hidden h-14 flex items-center justify-between px-4 border-b border-border-gray flex-shrink-0"
          onClick={onMobileClose}
        >
          <span className="text-sm font-inter font-medium text-ink-black">历史记录</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4l8 8" stroke="#888880" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Desktop toggle button */}
        <button
          onClick={() => setOpen(!open)}
          className="hidden md:flex h-10 items-center justify-center hover:bg-border-gray/40 transition-colors flex-shrink-0"
          title={open ? '收起' : '展开历史'}
        >
          <svg
            width="16" height="16" viewBox="0 0 16 16" fill="none"
            className={`transition-transform duration-300 ${open ? '' : 'rotate-180'}`}
          >
            <path d="M10 4 L6 8 L10 12" stroke="#888880" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Content — shown when desktop-open or mobile-open */}
        {(open || mobileOpen) && (
          <div className="flex-1 overflow-y-auto px-3 pb-4">
            <p className="hidden md:block text-[10px] text-mid-gray font-inter uppercase tracking-widest mb-3 mt-1 px-1">
              历史记录
            </p>
            <p className="md:hidden text-[10px] text-mid-gray font-inter uppercase tracking-widest mb-3 mt-3 px-1">
              最近对话
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
                  onClick={() => handleSelect(conv)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-inter leading-snug transition-all duration-150 ${
                    activeId === conv.id
                      ? 'bg-ink-green/10 text-ink-black border border-ink-green/20'
                      : 'hover:bg-border-gray/50 text-ink-black'
                  }`}
                >
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
    </>
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
