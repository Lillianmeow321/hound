'use client'

import { useState } from 'react'
import type { Citation } from '@/lib/types'

interface Props {
  citations: Citation[]
}

export default function Citations({ citations }: Props) {
  const [open, setOpen] = useState(true)

  if (!citations.length) return null

  return (
    <div className="border border-border-gray rounded-xl overflow-hidden mt-6">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-border-gray/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2h6l3 3v7H2z" stroke="#2d4a3e" strokeWidth="1.2"
              strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 2v3h3" stroke="#2d4a3e" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M4 7h5M4 9.5h3" stroke="#2d4a3e" strokeWidth="1" strokeLinecap="round" />
          </svg>
          <span className="text-xs font-inter font-medium text-ink-black">
            引用来源
          </span>
          <span className="text-[11px] text-mid-gray bg-border-gray/60 px-1.5 py-0.5 rounded-full">
            {citations.length}
          </span>
        </div>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <path d="M3 5l4 4 4-4" stroke="#888880" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-border-gray divide-y divide-border-gray/60">
          {citations.map((c, i) => (
            <a
              key={i}
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 px-5 py-3 hover:bg-border-gray/20 transition-colors group"
            >
              <span className="flex-shrink-0 text-[10px] text-mid-gray font-inter mt-0.5
                w-5 h-5 rounded-full bg-border-gray/50 flex items-center justify-center">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-inter font-medium text-ink-black group-hover:text-ink-green
                  transition-colors truncate">
                  {c.title}
                </div>
                <div className="text-[10px] text-mid-gray font-inter mt-0.5 truncate">
                  {c.source}
                </div>
              </div>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                className="flex-shrink-0 opacity-0 group-hover:opacity-60 transition-opacity mt-0.5">
                <path d="M5 2H2v8h8V7M7 1h4v4M6 6l4-4" stroke="#2d4a3e" strokeWidth="1.2"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
