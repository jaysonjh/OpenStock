## Context

OpenStock 当前所有市场数据通过 `finnhub.actions.ts` 获取，情绪数据通过 `adanos.actions.ts` 获取。代码中无数据源抽象层，Finnhub 和 Adanos 的调用被硬编码在页面组件和 Inngest functions 中。要支持 A 股或其他市场，需要一个可扩展的 Provider 系统——同时保持与上游 GitHub 仓库的完全合并兼容。

## Goals / Non-Goals

**Goals:**
- 定义统一的数据源接口（MarketData / Sentiment / Calendar），使新增数据源只需实现接口 + 一行注册
- 通过环境变量切换 Provider，不修改业务代码
- 保留所有现有功能：Finnhub 图表、Adanos 情绪、Watchlist 等全部正常工作
- 零侵入：不修改任何现有源文件

**Non-Goals:**
- 不修改页面/组件中的 import 路径（消费方改造留给后续独立 change）
- 不替换 TradingView 图表（图表是独立的客户端 widget）
- 不实现 A 股新闻（留给 `provider-news-eastmoney` 后续 change）
- 不实现国金证券情绪（留给 `provider-sentiment-gjzq` 后续 change）

## Decisions

### 1. 三大独立接口 vs 单一上帝接口

**选择**: 三个独立接口（`MarketDataProvider` / `SentimentProvider` / `TradingCalendarProvider`），各自隔离。

**理由**: 一个 Provider 通常只关心一个领域（如 stock-sdk 只提供行情，不提供情绪）。单一上帝接口要求所有 Provider 实现全部方法，导致大量空实现。三个独立接口遵循接口隔离原则 (ISP)，每个领域可独立演进。

**替代方案考虑**: 单一 `DataProvider` 接口 + 可选方法（`getSentiment?`）。缺点：接口膨胀，语义不清晰，注册机制变复杂。

### 2. Adapter 模式 vs Provider 重写

**选择**: 对现有 Finnhub 和 Adanos 使用 Adapter 模式（包装，不改源码）。

**理由**: 现有 `finnhub.actions.ts` 已经包含了高质量的缓存、错误处理、批量请求逻辑。Adapter 直接复用这些逻辑，避免重复实现。同时满足零侵入原则。

**替代方案考虑**: 重写 FinnhubProvider 直接调用 Finnhub REST API。缺点：丢失缓存策略和批量逻辑，代码重复。

### 3. 注册机制: Map + Factory vs DI 容器

**选择**: 简单的 `Map<string, Factory>` 注册表，环境变量驱动。

```
registerMarketProvider('finnhub', () => new FinnhubAdapter())
const provider = getMarketProvider()  // reads MARKET_DATA_PROVIDER env
```

**理由**: 零运行时依赖，无 DI 容器开销，适合 OpenStock 的简单架构。每个 Provider 在自己的 `index.ts` 中一行注册，解耦彻底。

**替代方案考虑**: 使用 InversifyJS 或 tsyringe 等 DI 容器。缺点：引入新依赖，配置复杂，过度工程。

### 4. Tushare 和 stock-sdk 的角色分工

**选择**: Tushare 作为 A 股生产级 Provider，stock-sdk 作为 A 股研究/备选 Provider。

**理由**:
- Tushare: 数据质量高，API 稳定，需注册获取 token，适合需要可靠数据的交易/生产场景
- stock-sdk: npm 零依赖，开箱即用，数据来自东方财富/腾讯公开接口（爬虫），适合研究和原型验证

两者可独立使用或组合使用——通过 `getMarketProviderForSymbol()` 或环境变量切换。

**替代方案考虑**: 只用 AKShare。缺点：需要 Python 环境 + AKTools HTTP 桥接服务，不符合 OpenStock 的纯 JS/TS 技术栈。

### 5. stock-sdk 作为 npm 依赖的论证

**选择**: 引入 `stock-sdk` npm 包。

**必要性论证**: A 股研究场景需要一个零配置、免费的数据源。AKShare 需要 Python 桥接，Tushare 需要注册。stock-sdk 是纯 TypeScript npm 包（`pnpm add stock-sdk`），零自身依赖，< 20KB，直接在 Node.js 中 import，完全符合 OpenStock 技术栈。

**优势**:
- 零 Python 依赖（vs AKShare）
- 零注册（vs Tushare）
- 支持浏览器 + Node.js 双端（vs AKShare / Tushare 仅服务端）
- 内置重试 / 频率限制 / 熔断机制
- ISC 许可证，兼容 AGPL-3.0

### Provider Dependency Graph

```
┌────────────────────────────────────────────────────────────────┐
│                       env variables                             │
│  MARKET_DATA_PROVIDER  SENTIMENT_PROVIDER  CALENDAR_PROVIDER   │
└──────┬──────────────────────┬─────────────────────┬────────────┘
       │                      │                     │
       ▼                      ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Registry   │    │   Registry   │    │   Registry   │
│  marketData  │    │  sentiment   │    │   calendar   │
│  Map<name,   │    │  Map<name,   │    │  Map<name,   │
│   Factory>   │    │   Factory>   │    │   Factory>   │
└───┬───┬───┬──┘    └──────┬──────┘    └──┬──────┬────┘
    │   │   │              │              │      │
    ▼   ▼   ▼              ▼              ▼      ▼
 Finnhub│stock-sdk      AdanosAdapter    US   AShare
Adapter│Provider
       │
   TushareProvider

   ┌──────────────────────────────────┐
   │ 现有源码 ZERO 修改                │
   │ finnhub.actions.ts ✓            │
   │ adanos.actions.ts ✓             │
   │ lib/inngest/functions.ts ✓      │
   │ components/ ✓                   │
   │ app/ ✓                          │
   └──────────────────────────────────┘
```

### Data Format Mapping (Tushare)

| Tushare Response | Canonical Type |
|---|---|
| `ts_code: "600519.SH"` | `Quote.symbol` |
| `close: 1750.50` | `Quote.price` |
| `close - pre_close` | `Quote.change` |
| `(close - pre_close)/pre_close * 100` | `Quote.changePercent` |
| `open, high, low, vol` | `Quote.open/high/low/volume` |

### Data Format Mapping (stock-sdk)

| stock-sdk Response | Canonical Type |
|---|---|
| `item.code: "600519"` | `Quote.symbol` (需映射回 "600519.SH") |
| `item.price: 1750.50` | `Quote.price` |
| `item.change: 15.30` | `Quote.change` |
| `item.changePercent: 0.88` | `Quote.changePercent` |

### Data Format Mapping (Adanos → Sentiment)

| Adanos `StockSentimentInsights` | Canonical `SentimentResult` |
|---|---|
| `averageBuzz` | `averageBuzz` |
| `bullishAverage` | `bullishAverage` |
| `sourceAlignment` | `sourceAlignment` |
| `availableSources` | `availableSources` |
| `sources[i].source` | `sources[i].sourceKey` |
| `sources[i].label` | `sources[i].sourceLabel` |
| `sources[i].buzzScore` | `sources[i].buzzScore` |
| `sources[i].bullishPct` | `sources[i].bullishPct` |
| `sources[i].trend` | `sources[i].trend` |
| `sources[i].metricValue` | `sources[i].metricValue` |

## Risks / Trade-offs

| 风险 | 缓解措施 |
|---|---|
| stock-sdk 数据源为爬虫，接口可能随时变更 | stock-sdk 自身有重试/熔断机制；Tushare 作为独立备选；不阻塞主流程（返回 null） |
| Tushare 免费层有频率限制 | 在 Provider 内部实现请求间隔控制；stock-sdk 作为无限制备选 |
| 当前不修改消费方 import，Provider 系统暂时"闲置" | 这是蓄意设计——基础设施先建好，消费方切换由后续独立 change 完成，降低单次变更风险 |
| `getMarketProvider()` 每次调用创建新 Provider 实例 | 各 Provider 内部无重状态（仅 SDK 客户端实例），创建开销可忽略。如需缓存可后续加 |
| A 股节假日数据依赖 Tushare API | 实现内存缓存，启动时拉取一次全年数据；Tushare 不可用时 fallback 到静态周末判断 |

## Open Questions

- 无。所有设计决策已在本文档中明确。
