'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type Lang = 'zh' | 'en'

// ─── All UI strings ───────────────────────────────────────────────────────────
export const translations = {
  zh: {
    // Navbar
    brand: 'Hound——边牧分析师',
    tagline: '聪明小狗帮你快快猛猛写投资memo！汪',
    navResearch: '投研分析',
    navResearchShort: '投研',
    navSizing: '市场规模测算',
    navSizingShort: '规模',

    // Landing
    landingHero: 'Hound——边牧分析师',
    landingSubtitle: '聪明小狗帮你快快写投资memo！汪',
    landingDesc: '知识库来自一线沉淀数据，结合联网搜索，自动生成投研报告与市场测算',
    landingCta: '开始使用 →',
    landingScrollHint: '向下滚动',
    landingSection2Title: '看看边牧能做什么',
    landingCardResearch: '投研分析',
    landingCardSizing: '市场规模测算',
    landingTableHeaders: ['情景', '假设条件', '市场规模（SOM，未来3年）'],

    // Research page
    researchTitle: '投研分析',
    researchSlogan: '最懂投资人与consultant语言风格的小边牧。',
    researchDesc: '知识库来自一线沉淀数据，懂分析师的需求与痛点。\n输入研究方向后，将结合知识库智慧与联网搜索，自动生成研究报告。',
    inputPlaceholderNew: '输入研究方向，比如 AI情感陪伴 汪！',
    inputPlaceholderFollowup: '追问报告内容，或输入新赛道开始全新分析...',

    // Market sizing page
    sizingTitle: '市场规模测算',
    sizingDesc: '不知道怎么拍市场规模？边牧分析师来帮你。请描述公司/行业，小边牧将追问 2–3 个关键问题，然后输出市场测算。适配 VCer、consultant 和互联网从业者的颗粒度需求。',
    sizingInputNew: '描述这家公司，几句话即可🐶',
    sizingInputAnswer: '在这里回答上面的问题...',
    sizingInputWaiting: '等待处理中...',

    // Progress labels (must match what backend sends for STATUS_PROGRESS lookup)
    progressPlanning: '正在规划研究维度...',
    progressRetrieving: (n: number) => `正在并行检索 ${n} 个维度（知识库 + 联网）...`,
    progressGenerating: '正在生成报告...',
    progressReviewing: '正在审核报告质量...',
    progressGenHint: '多agent并行，第一次小边牧跑会有点慢，后面就好了！汪 🐕',
    progressDimCount: (done: number, total: number) => `已完成 ${done}/${total} 个维度`,
    progressSizingCollect: '正在分析信息充分度...',
    progressSizingRound: (n: number) => `收集信息中（第${n}轮）...`,
    progressSizingCases: '正在检索类似案例...',
    progressSizingWeb: '正在联网搜索行业数据...',
    progressSizingReport: '正在生成测算报告...',

    // Report view
    reportLabel: '研究报告',
    exportBtn: '导出 .md',
    newAnalysisHint: '想换个赛道？让小边牧重新出发！',
    newAnalysisBtn: '🐕 开启新赛道分析',
    followupLabel: '追问记录',

    // Errors
    errorPrefix: '连接出错：',

    // Loading tip cards
    tipCards: [
      '小边牧正在为你做的事：理解研究方向 → 拆解5个研究维度 → 检索行业知识 → 综合分析 → 质量审核。汪🐾',
      '为什么报告会有具体的厂商案例？因为Hound在尝试用产业研究的视角讲清楚——一家公司在什么时间做了什么动作，结果是什么。',
      '等待是值得的：你将得到的不是一份"是什么"的报告，而是一份带因果链路、可以辅助决策的洞察。',
      '喜欢这个项目的话，欢迎分享给身边的VCer、consultant和互联网从业者～小边牧会很开心 🐕',
    ],

    // Chitchat
    chitchat: [
      '你好你好！汪！🐾',
      '谢谢你，你真好！尾巴摇摆中...🐕',
      '你也好！你也好！汪汪！',
      '好开心见到你！我们开始研究吧？🐾',
      '汪！收到！有什么研究方向可以告诉我～',
    ],
  },

  en: {
    // Navbar
    brand: 'Hound — Border Collie Analyst',
    tagline: 'A clever collie writing your investment memos! Woof',
    navResearch: 'Research',
    navResearchShort: 'R&A',
    navSizing: 'Market Sizing',
    navSizingShort: 'Sizing',

    // Landing
    landingHero: 'Hound — Border Collie Analyst',
    landingSubtitle: 'A clever collie writing your investment memos! Woof',
    landingDesc: 'Built on frontline analyst knowledge, enhanced with live web search. Auto-generates research reports and market sizing.',
    landingCta: 'Get Started →',
    landingScrollHint: 'Scroll Down',
    landingSection2Title: 'What Can Hound Do?',
    landingCardResearch: 'Research Analysis',
    landingCardSizing: 'Market Sizing',
    landingTableHeaders: ['Scenario', 'Assumptions', 'Market Size (SOM, 3-Year)'],

    // Research page
    researchTitle: 'Research Analysis',
    researchSlogan: 'The AI analyst that speaks fluent VC and consultant.',
    researchDesc: 'Built on frontline analyst data with web search integration.\nEnter a research topic and Hound will generate a full investment research report.',
    inputPlaceholderNew: 'Enter a topic, e.g. AI Companions 🐾',
    inputPlaceholderFollowup: 'Ask a follow-up, or enter a new topic to start fresh...',

    // Market sizing page
    sizingTitle: 'Market Sizing',
    sizingDesc: "Not sure how to size the market? Hound's got you. Describe the company, and Hound will ask 2–3 targeted questions, then output a full market sizing. Tailored for VCs, consultants, and operators.",
    sizingInputNew: 'Describe the company in a few sentences 🐶',
    sizingInputAnswer: 'Answer the question above...',
    sizingInputWaiting: 'Processing...',

    // Progress labels (must match backend en labels)
    progressPlanning: 'Planning research dimensions...',
    progressRetrieving: (n: number) => `Retrieving ${n} dimensions in parallel (knowledge base + web)...`,
    progressGenerating: 'Generating report...',
    progressReviewing: 'Reviewing report quality...',
    progressGenHint: 'Multi-agent in parallel — first run is a bit slow, speeds up after! Woof 🐕',
    progressDimCount: (done: number, total: number) => `${done}/${total} dimensions done`,
    progressSizingCollect: 'Analyzing information sufficiency...',
    progressSizingRound: (n: number) => `Collecting info (round ${n})...`,
    progressSizingCases: 'Retrieving similar cases...',
    progressSizingWeb: 'Searching web for industry data...',
    progressSizingReport: 'Generating sizing report...',

    // Report view
    reportLabel: 'Research Report',
    exportBtn: 'Export .md',
    newAnalysisHint: 'Want a new topic? Let Hound start fresh!',
    newAnalysisBtn: '🐕 Start New Analysis',
    followupLabel: 'Follow-ups',

    // Errors
    errorPrefix: 'Connection error: ',

    // Loading tip cards
    tipCards: [
      "What Hound is doing right now: understanding your topic → breaking it into 5 research dimensions → searching the knowledge base → synthesizing insights → quality review. Woof 🐾",
      "Why does the report include specific company examples? Hound tries to tell the story from an industry research lens — what a company did, when, and what came next.",
      "The wait is worth it: you won't get a 'what is this' summary — you'll get a causally-linked analysis that can actually inform investment decisions.",
      "If you like this project, feel free to share it with VCs, consultants, and operators around you — Hound would be very happy 🐕",
    ],

    // Chitchat
    chitchat: [
      'Hey there! Woof! 🐾',
      "Thanks, you're so kind! Tail wagging...🐕",
      'Same to you! Woof woof!',
      'So happy to meet you! Ready to start? 🐾',
      'Woof! Got it! What would you like to research?',
    ],
  },
} as const

export type Translations = typeof translations[Lang]

// ─── Context ──────────────────────────────────────────────────────────────────
interface LangCtx {
  lang: Lang
  setLang: (l: Lang) => void
  t: Translations
}

const LanguageContext = createContext<LangCtx>({
  lang: 'zh',
  setLang: () => {},
  t: translations.zh,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('zh')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('hound-lang') as Lang | null
      if (saved === 'en' || saved === 'zh') setLangState(saved)
    } catch {}
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    try { localStorage.setItem('hound-lang', l) } catch {}
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LangCtx {
  return useContext(LanguageContext)
}
