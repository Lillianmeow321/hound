import type { Report, ProgressStep, FollowUpQuestion } from './types'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const MOCK_COMPETITIVE_REPORT = `## 赛道概览

新能源汽车补能基础设施赛道正处于高速扩张期。截至2024年底，国内公共充电桩保有量已突破**320万台**，同比增长超60%，车桩比持续改善至约2.8:1，但与欧美成熟市场相比仍有较大缺口。

---

## 核心玩家格局

| 公司 | 市占率 | 核心优势 | 近期动态 |
|------|--------|---------|---------|
| 特来电 | ~18% | 非车载充电、安全技术 | B轮融资超20亿元 |
| 星星充电 | ~16% | 运营网络密度 | 切入车网互动（V2G） |
| 华为数字能源 | ~12% | 模块化超充方案 | 绑定问界生态 |
| 国家电网（e充电） | ~22% | 高速场景垄断优势 | 开放第三方平台接入 |
| 小桩 / 云快充 | SaaS层 | 充电网络操作系统 | 跑通多品牌聚合模式 |

---

## 差异化机会点

1. **超充竞争白热化**：华为、小鹏、特斯拉均在抢占800V超充桩心智，但乡镇及高速服务区布局仍显著不足。

2. **软件层价值待释放**：充电SaaS（运营管理、动态定价、负荷调度）目前渗透率不足15%，是纯软件公司的进入窗口。

3. **储能+充电融合趋势**：光储充一体化场站在峰谷电价差较大的地区（如广东、浙江）已初步跑通商业模式，ROI周期压缩至约5.5年。

---

## 投资关注维度

- **车桩比拐点**：市场预计2026年底达到1.5:1，届时存量运营收益将显著改善
- **V2G政策催化**：国家能源局2024年试点政策落地，双向充放电为充电桩赋予"储能资产"属性
- **整合并购窗口**：中腰部运营商现金流普遍承压，头部玩家有望通过并购提升区域密度

---

## 风险提示

> 补贴退坡压力、电力市场改革进度不及预期、车企自建充电网络的排他性可能压缩第三方空间。`

const MOCK_MARKET_SIZING_REPORT = `## 业务定性

该公司为企业级HR SaaS服务商，聚焦中大型制造业客户，提供涵盖招聘管理、员工档案、绩效考核及劳动合规的一体化数字化解决方案，目标替代传统Excel+线下流程管理模式。

---

## 测算框架

本次采用**自下而上法**与**类比法**双轮验证：

- **自下而上法**：目标客户数 × 平均客单价（ARR）
- **类比法**：参考美国Workday、Ceridian在中国同等市场规模的折算系数

选择理由：HR SaaS具有明确的客户画像（500人以上制造业企业）和清晰的定价模型，自下而上法精度较高。

---

## TAM → SAM → SOM 拆解

**TAM**（中国企业HR软件总市场）：约 **420亿元/年** [^1]
  测算逻辑：中国企业HR软件采购总支出，含ERP中HR模块、独立HR SaaS、劳动力管理系统

**SAM**（制造业500人以上企业HR SaaS潜在市场）：约 **85亿元/年** [^2]
  测算逻辑：制造业企业占HR软件市场约20%份额，500人以上企业为主要买单方，筛选后约18,000家目标客户 × 平均ARR 45,000元

**SOM**（3年内可触达市场）：约 **8-15亿元** [^3]
  测算逻辑：基于现有销售团队规模和增速，预计3年内可覆盖约2,000家签约客户，ARR范围40,000-75,000元

---

## 三种情景

| 情景 | 假设条件 | 市场规模（SOM） |
|------|---------|--------------|
| 乐观 | 劳动法合规监管趋严，采购决策加速；大模型辅助功能提升续费率至90% | ~15亿元ARR（2027E） |
| 中性 | 市场教育周期约18个月，稳步扩张 | ~9亿元ARR（2027E） |
| 悲观 | 宏观制造业景气度下滑，客户预算收缩；竞品SAP/用友降价 | ~5亿元ARR（2027E） |

---

## 关键假设与风险

1. **假设：制造业客户愿意将HR数据上云**
   若数据安全顾虑导致私有化部署需求占主导，则SaaS模式成本结构将显著劣化（私有化部署ARR溢价有限但实施成本高3-5倍）

2. **假设：平均ARR维持4-7万元区间**
   若头部客户压价或竞争白热化导致ARR均值降至2.5万元以下，SOM上限将压缩至6亿元

3. **假设：监管合规需求持续驱动采购**
   若劳动法执行力度放松，补充性SaaS采购优先级将显著下降

---

## 引用来源

[^1]: IDC中国企业应用软件市场追踪报告（2024H1）
[^2]: 国家统计局制造业企业规模数据，内部测算
[^3]: 参考同赛道竞品摩尔人力、薪人薪事公开披露数据`

const MOCK_FOLLOWUP_QUESTIONS = [
  '您的目标客户主要集中在哪个行业或地区？',
  '公司的核心变现方式是订阅制SaaS、按使用量收费，还是项目制实施？',
  '您预计产品主要在哪些城市或区域优先落地？'
]

export interface StreamOptions {
  onStep: (step: ProgressStep) => void
  onAnimationState: (state: 'idle' | 'running' | 'thinking' | 'returning') => void
  onReport: (report: Report) => void
}

export async function mockGenerateCompetitiveReport(
  query: string,
  opts: StreamOptions
): Promise<void> {
  opts.onStep({ label: '正在规划研究维度...', status: 'active' })
  opts.onAnimationState('idle')
  await delay(1800)

  opts.onStep({ label: '正在检索知识库...', status: 'active' })
  opts.onAnimationState('running')
  await delay(2800)

  opts.onStep({ label: '正在生成报告...', status: 'active' })
  opts.onAnimationState('thinking')
  await delay(3200)

  opts.onStep({ label: '正在审核报告质量...', status: 'active' })
  await delay(1600)

  opts.onAnimationState('returning')
  await delay(1000)

  opts.onReport({
    content: MOCK_COMPETITIVE_REPORT,
    review: {
      score: 8,
      pass: true,
      suggestions: [
        '可进一步补充各玩家的资本结构及融资轮次对比',
        '超充技术路线（800V vs 400V）的成本差异可量化',
        '建议加入季度装机量数据对比图表'
      ],
      issues: []
    },
    citations: [
      { title: '2024年中国充电基础设施发展报告', url: 'https://example.com/report1', source: '中国电动汽车充电基础设施促进联盟' },
      { title: '特来电B轮融资公告', url: 'https://example.com/report2', source: '特来电官方' },
      { title: 'BloombergNEF 全球充电桩市场追踪', url: 'https://example.com/report3', source: 'BloombergNEF' },
      { title: '国家能源局V2G试点政策文件', url: 'https://example.com/report4', source: '国家能源局' }
    ]
  })
}

export interface MarketSizingOptions {
  onFollowUp: (q: FollowUpQuestion) => Promise<string>
  onStep: (step: ProgressStep) => void
  onAnimationState: (state: 'idle' | 'running' | 'thinking' | 'returning') => void
  onReport: (report: Report) => void
}

export async function mockGenerateMarketSizingReport(
  initialInput: string,
  opts: MarketSizingOptions
): Promise<void> {
  opts.onStep({ label: '正在分析信息充分度...', status: 'active' })
  opts.onAnimationState('thinking')
  await delay(1200)

  for (let round = 0; round < 3; round++) {
    const question = MOCK_FOLLOWUP_QUESTIONS[round]
    const answer = await opts.onFollowUp({
      question,
      round: round + 1,
      totalRounds: 3
    })

    if (!answer.trim()) break

    await delay(800)
    opts.onStep({ label: `收集信息中（第${round + 1}轮）...`, status: 'active' })

    if (round === 1) break
  }

  opts.onStep({ label: '正在检索类似案例...', status: 'active' })
  opts.onAnimationState('running')
  await delay(2500)

  opts.onStep({ label: '正在生成测算报告...', status: 'active' })
  opts.onAnimationState('thinking')
  await delay(3500)

  opts.onAnimationState('returning')
  await delay(1000)

  opts.onReport({
    content: MOCK_MARKET_SIZING_REPORT,
    review: {
      score: 7,
      pass: true,
      suggestions: [
        '建议进一步验证SAM中目标客户数量的数据来源',
        '可补充竞品定价对比，支撑ARR假设区间',
        '乐观情景的大模型辅助功能假设需要产品验证支撑'
      ],
      issues: []
    },
    citations: [
      { title: 'IDC中国企业应用软件市场追踪报告（2024H1）', url: 'https://example.com/idc', source: 'IDC' },
      { title: '国家统计局制造业企业规模数据', url: 'https://example.com/stats', source: '国家统计局' },
      { title: '摩尔人力招股说明书', url: 'https://example.com/ipo', source: '深交所' }
    ]
  })
}

export async function mockFollowUpChat(
  query: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _report: string
): Promise<string> {
  await delay(1500)
  return `关于您提到的"${query.slice(0, 20)}..."，根据报告内容，这一部分涉及到市场格局中的差异化竞争要素。从当前数据看，头部玩家在此维度的布局相对领先，建议重点关注技术壁垒的可持续性以及规模效应的边际递增趋势。如需更深入分析，可以指定具体赛道方向。`
}
