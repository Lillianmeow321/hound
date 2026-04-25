'use client'

import { useRef, useEffect } from 'react'

interface Props {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  disabled?: boolean
  placeholder?: string
  autoFocus?: boolean
}

export default function InputArea({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = '输入研究方向，比如 AI情感陪伴',
  autoFocus = false,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)
  // Track Chinese IME composition state to avoid firing on candidate selection
  const isComposingRef = useRef(false)

  useEffect(() => {
    if (autoFocus) ref.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`
  }, [value])

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !isComposingRef.current) {
      e.preventDefault()
      if (!disabled && value.trim()) onSubmit()
    }
  }

  return (
    <div className={`relative bg-white border rounded-2xl shadow-sm transition-shadow duration-200 ${
      disabled
        ? 'border-border-gray opacity-60 cursor-not-allowed'
        : 'border-border-gray hover:shadow-md focus-within:border-ink-green/40 focus-within:shadow-md'
    }`}>
      <textarea
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKey}
        onCompositionStart={() => { isComposingRef.current = true }}
        onCompositionEnd={() => { isComposingRef.current = false }}
        disabled={disabled}
        placeholder={placeholder}
        rows={3}
        className="w-full resize-none rounded-2xl bg-transparent px-5 pt-4 pb-12 text-sm font-inter text-ink-black placeholder-mid-gray/60 outline-none leading-relaxed"
        style={{ minHeight: '88px' }}
      />

      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 pb-3">
        <span className="hidden md:block text-[11px] text-mid-gray/70 font-inter select-none">
          Enter 发送 · Shift+Enter 换行
        </span>
        <button
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-inter font-medium transition-all duration-200 ${
            disabled || !value.trim()
              ? 'bg-border-gray text-mid-gray cursor-not-allowed'
              : 'bg-ink-green text-cream hover:bg-ink-green/90 shadow-sm hover:shadow-md'
          }`}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 6h10M7 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          发送
        </button>
      </div>
    </div>
  )
}
