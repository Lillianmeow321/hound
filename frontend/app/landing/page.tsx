'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import BorderCollie from '@/components/animations/BorderCollie'

function useCollieSize() {
  const [size, setSize] = useState(80)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const update = () => setSize(mq.matches ? 120 : 80)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return size
}

function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

const COMPETITIVE_PARAS = [
  '市场呈现"哑铃型"分化，银发经济与Z世代成为两大核心驱动力。一方面，以电动轮椅、消费级外骨骼为代表的AI硬件精准切入"被时光磨损"的银发人群，解决其行动与生活痛点，市场定位清晰且刚需属性强。另一方面，以AI眼镜、AI玩具、智能乐器为代表的产品，则瞄准Z世代及年轻上班族对情绪价值、个性化表达和社交属性的追求，驱动着新兴品类的爆发。',
  '技术落地面临"人机意志对冲"与"场景低频"双重挑战，从"可用"到"好用"仍有距离。私有知识库明确指出，在大量决策场景下，AI硬件（如电动轮椅）存在机器判断与人类意志判断的冲突，需要"case by case"解决。同时，AI眼镜、AI学习机、智能乐器等产品普遍存在"新鲜感过后易闲置"的问题，表明产品尚未找到足够高频、刚需的应用场景，用户粘性不足。',
]

const SIZING_ROWS = [
  {
    scenario: '乐观',
    condition: '纽约渗透率40%（2万人），拓展至波士顿/洛杉矶等2-3城市，总用户10万，ARPU 40美元',
    size: '约400万美元（100,000人 × 40美元）',
  },
  {
    scenario: '中性',
    condition: '纽约渗透率25%（1.25万人），拓展1个新城市，总用户7万，ARPU 25美元',
    size: '约175万美元（70,000人 × 25美元）',
  },
  {
    scenario: '悲观',
    condition: '纽约渗透率15%（0.75万人），未能拓展新城市，ARPU 15美元',
    size: '约11.25万美元（7,500人 × 15美元）',
  },
]

export default function LandingPage() {
  const router = useRouter()
  const collieSize = useCollieSize()
  const hero = useInView(0)
  const section2 = useInView(0.08)
  const leftCard = useInView(0.1)
  const rightCard = useInView(0.1)

  function handleStart() {
    try { localStorage.setItem('hound-seen-landing', '1') } catch {}
    router.push('/')
  }

  return (
    <main className="bg-cream min-h-screen font-inter overflow-x-hidden">

      {/* ── Screen 1: hero ───────────────────────────────────────────── */}
      <section
        ref={hero.ref}
        className="min-h-screen flex flex-col items-center justify-center px-4 md:px-6 py-16 md:py-24 text-center"
      >
        <div
          className={`flex flex-col items-center gap-7 max-w-md mx-auto
            transition-all duration-700 ease-out
            ${hero.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          <BorderCollie state="idle" variant="competitive" size={collieSize} />

          <div className="space-y-3">
            <h1 className="font-playfair text-[1.7rem] md:text-[2.25rem] font-medium text-ink-black leading-tight tracking-tight">
              Hound——边牧分析师
            </h1>
            <p className="text-sm md:text-base text-ink-green font-inter font-light tracking-wide">
              聪明小狗帮你快快写投资memo！汪
            </p>
          </div>

          <p className="text-sm text-mid-gray font-inter leading-relaxed max-w-xs">
            知识库来自一线沉淀数据，结合联网搜索，自动生成投研报告与市场测算
          </p>

          <button
            onClick={handleStart}
            className="mt-1 px-9 py-2.5 border border-ink-green text-ink-green text-sm font-inter
              tracking-widest rounded-sm transition-all duration-200
              hover:bg-ink-green hover:text-cream active:scale-95"
          >
            开始使用 →
          </button>
        </div>

        {/* scroll hint */}
        <div
          className={`absolute bottom-10 flex flex-col items-center gap-1.5 transition-all duration-700 delay-500
            ${hero.inView ? 'opacity-40' : 'opacity-0'}`}
        >
          <span className="text-[10px] font-inter text-mid-gray tracking-widest uppercase">向下滚动</span>
          <div className="w-px h-6 bg-mid-gray/40 animate-pulse" />
        </div>
      </section>

      {/* ── Screen 2: capability cards ───────────────────────────────── */}
      <section
        ref={section2.ref}
        className={`px-4 md:px-6 pb-20 md:pb-28 pt-4 transition-all duration-700 ease-out
          ${section2.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      >
        <div className="max-w-5xl mx-auto">
          <h2 className="font-playfair text-[1.5rem] md:text-[1.9rem] font-medium text-ink-black text-center mb-10 md:mb-14 tracking-tight">
            看看边牧能做什么
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

            {/* Left card: 投研分析 */}
            <div
              ref={leftCard.ref}
              className="relative bg-cream border border-ink-green/25 rounded-xl p-7 pt-9 shadow-[0_1px_12px_rgba(45,74,62,0.06)]"
            >
              <span className="absolute -top-3 left-6 bg-cream px-3 py-0.5
                text-[10px] font-inter font-semibold text-ink-green tracking-[0.12em] uppercase
                border border-ink-green/25 rounded-full">
                投研分析
              </span>

              <div className="space-y-4">
                {COMPETITIVE_PARAS.map((para, i) => (
                  <p
                    key={i}
                    className={`text-[13px] font-inter text-ink-black/85 leading-[1.85]
                      transition-all duration-700 ease-out
                      ${leftCard.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
                    style={{ transitionDelay: leftCard.inView ? `${i * 280}ms` : '0ms' }}
                  >
                    {para}
                  </p>
                ))}
              </div>
            </div>

            {/* Right card: 市场规模测算 */}
            <div
              ref={rightCard.ref}
              className="relative bg-cream border border-ink-green/25 rounded-xl p-7 pt-9 shadow-[0_1px_12px_rgba(45,74,62,0.06)]"
            >
              <span className="absolute -top-3 left-6 bg-cream px-3 py-0.5
                text-[10px] font-inter font-semibold text-ink-green tracking-[0.12em] uppercase
                border border-ink-green/25 rounded-full">
                市场规模测算
              </span>

              <div className="overflow-x-auto">
                <table className="w-full font-inter text-[12.5px]" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['情景', '假设条件', '市场规模（SOM，未来3年）'].map((h) => (
                        <th
                          key={h}
                          className="text-left text-[10px] font-semibold text-ink-green uppercase
                            tracking-[0.1em] pb-2.5 pr-4 last:pr-0 border-b border-ink-green/30"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SIZING_ROWS.map((row, i) => (
                      <tr
                        key={row.scenario}
                        className={`transition-all duration-600 ease-out
                          ${rightCard.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
                        style={{ transitionDelay: rightCard.inView ? `${i * 220}ms` : '0ms' }}
                      >
                        <td className="py-3 pr-4 align-top border-b border-ink-green/12 w-10">
                          <span className="font-medium text-ink-black">{row.scenario}</span>
                        </td>
                        <td className="py-3 pr-4 align-top border-b border-ink-green/12 text-ink-black/75 leading-relaxed">
                          {row.condition}
                        </td>
                        <td className="py-3 align-top border-b border-ink-green/12 text-ink-black/75 leading-relaxed">
                          {row.size}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </section>

    </main>
  )
}
