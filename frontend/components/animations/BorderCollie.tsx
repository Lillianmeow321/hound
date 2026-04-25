'use client'

import Image from 'next/image'
import type { AnimationState } from '@/lib/types'

interface Props {
  state: AnimationState
  size?: number
  /** 'competitive' shows sitting dog at idle; 'market' shows playing dog at idle */
  variant?: 'competitive' | 'market'
}

const IMAGES: Record<string, string> = {
  sitting:      '/collie/sitting.png',
  playing:      '/collie/playing.png',
  thinking:     '/collie/questioning.png',
  running:      '/collie/writing.png',
  returning:    '/collie/jiayou.png',
}

const STATE_CLASSES: Record<string, string> = {
  idle:      'animate-collie-bob',
  running:   'animate-collie-bounce',
  thinking:  'animate-collie-pulse',
  returning: 'animate-collie-pop',
}

export default function BorderCollie({
  state,
  size = 160,
  variant = 'competitive',
}: Props) {
  const imgSrc = resolveImage(state, variant)
  const animClass = STATE_CLASSES[state] ?? ''

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`${animClass} will-change-transform`}
           style={{ width: size, height: size }}>
        <Image
          src={imgSrc}
          alt="Hound 边牧分析师"
          width={size}
          height={size}
          className="object-contain w-full h-full select-none"
          priority
        />
      </div>

      {state === 'returning' && (
        <span className="text-xs text-ink-green font-inter tracking-wide animate-fade-in">
          报告送到！汪
        </span>
      )}
    </div>
  )
}

function resolveImage(state: AnimationState, variant: 'competitive' | 'market'): string {
  switch (state) {
    case 'running':   return IMAGES.running
    case 'thinking':  return IMAGES.thinking
    case 'returning': return IMAGES.returning
    case 'idle':
    default:
      return variant === 'market' ? IMAGES.playing : IMAGES.sitting
  }
}
