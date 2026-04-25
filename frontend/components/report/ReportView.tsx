'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Report } from '@/lib/types'
import QualityScore from './QualityScore'
import Citations from './Citations'

interface Props {
  report: Report
  query: string
  onExport: () => void
  onNewAnalysis?: () => void
}

export default function ReportView({ report, query, onExport, onNewAnalysis }: Props) {
  return (
    <div className="animate-fade-in space-y-4">
      {/* Report header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] text-mid-gray font-inter uppercase tracking-widest mb-1">
            研究报告
          </p>
          <h2 className="font-playfair text-xl font-medium text-ink-black leading-snug">
            {query}
          </h2>
        </div>

        {/* Export button */}
        <button
          onClick={onExport}
          className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border-gray
            text-xs font-inter text-mid-gray hover:border-ink-green/30 hover:text-ink-green
            hover:bg-ink-green/5 transition-all duration-150"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 1v7M3.5 5l3 3 3-3M2 10h9" stroke="currentColor" strokeWidth="1.3"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          导出 .md
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-border-gray" />

      {/* Markdown content */}
      <div className="prose-report">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            table: ({ children, ...props }) => (
              <div className="overflow-x-auto -mx-1">
                <table {...props}>{children}</table>
              </div>
            ),
          }}
        >
          {report.content}
        </ReactMarkdown>
      </div>

      {/* Quality score */}
      <QualityScore review={report.review} />

      {/* Citations */}
      <Citations citations={report.citations} />

      {/* New analysis CTA */}
      {onNewAnalysis && (
        <div className="flex flex-col items-center gap-3 pt-8 border-t border-border-gray">
          <p className="text-xs text-mid-gray font-inter">想换个赛道？让小边牧重新出发！</p>
          <button
            onClick={onNewAnalysis}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl border-2 border-ink-green
              text-sm font-inter font-medium text-ink-green
              hover:bg-ink-green hover:text-cream transition-all duration-200"
          >
            🐕 开启新赛道分析
          </button>
        </div>
      )}
    </div>
  )
}
