'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const pathname = usePathname()
  const isMarket = pathname.startsWith('/market-sizing')

  return (
    <header className="h-14 border-b border-border-gray bg-cream/95 backdrop-blur-sm sticky top-0 z-40 flex items-center px-5">
      {/* Logo + Brand */}
      <div className="flex items-center gap-3 flex-1">
        <Image
          src="/collie/logo.png"
          alt="Hound"
          width={36}
          height={36}
          className="object-contain select-none"
          priority
        />
        <div>
          <h1 className="font-playfair text-lg font-medium leading-none text-ink-black tracking-tight">
            Hound——边牧分析师
          </h1>
          <p className="text-[10px] text-mid-gray leading-none mt-1 font-inter">
            聪明小狗帮你快快猛猛写投资memo！汪
          </p>
        </div>
      </div>

      {/* Mode switcher */}
      <nav className="flex items-center gap-1 bg-white/60 border border-border-gray rounded-full px-1 py-1">
        <Link
          href="/"
          className={`px-4 py-1.5 rounded-full text-sm font-inter font-medium transition-all duration-200 ${
            !isMarket
              ? 'bg-ink-green text-cream shadow-sm'
              : 'text-mid-gray hover:text-ink-black'
          }`}
        >
          投研分析
        </Link>
        <Link
          href="/market-sizing"
          className={`px-4 py-1.5 rounded-full text-sm font-inter font-medium transition-all duration-200 ${
            isMarket
              ? 'bg-ink-green text-cream shadow-sm'
              : 'text-mid-gray hover:text-ink-black'
          }`}
        >
          市场规模测算
        </Link>
      </nav>
    </header>
  )
}
