'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

interface Props {
  onMenuClick?: () => void
}

export default function Navbar({ onMenuClick }: Props) {
  const pathname = usePathname()
  const isMarket = pathname.startsWith('/market-sizing')

  return (
    <header className="border-b border-border-gray bg-cream/95 backdrop-blur-sm sticky top-0 z-40">
      <div className="h-14 flex items-center px-4 md:px-5 gap-2">

        {/* Logo + Brand */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <Image
            src="/collie/logo.png"
            alt="Hound"
            width={32}
            height={32}
            className="object-contain select-none flex-shrink-0"
            priority
          />
          <div className="min-w-0">
            <h1 className="font-playfair text-base md:text-lg font-medium leading-none text-ink-black tracking-tight">
              Hound——边牧分析师
            </h1>
            <p className="hidden md:block text-[10px] text-mid-gray leading-none mt-1 font-inter">
              聪明小狗帮你快快猛猛写投资memo！汪
            </p>
          </div>
        </div>

        {/* Mode switcher */}
        <nav className="flex items-center gap-0.5 md:gap-1 bg-white/60 border border-border-gray rounded-full px-1 py-1 flex-shrink-0">
          <Link
            href="/"
            className={`px-2.5 md:px-4 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-inter font-medium transition-all duration-200 whitespace-nowrap ${
              !isMarket
                ? 'bg-ink-green text-cream shadow-sm'
                : 'text-mid-gray hover:text-ink-black'
            }`}
          >
            <span className="md:hidden">投研</span>
            <span className="hidden md:inline">投研分析</span>
          </Link>
          <Link
            href="/market-sizing"
            className={`px-2.5 md:px-4 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-inter font-medium transition-all duration-200 whitespace-nowrap ${
              isMarket
                ? 'bg-ink-green text-cream shadow-sm'
                : 'text-mid-gray hover:text-ink-black'
            }`}
          >
            <span className="md:hidden">规模</span>
            <span className="hidden md:inline">市场规模测算</span>
          </Link>
        </nav>

        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="md:hidden flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg hover:bg-border-gray/50 transition-colors"
          aria-label="打开菜单"
        >
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
            <path d="M0 1h18M0 7h18M0 13h18" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

      </div>
    </header>
  )
}
