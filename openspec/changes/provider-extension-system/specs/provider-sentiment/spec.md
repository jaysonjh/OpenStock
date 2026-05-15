## ADDED Requirements

### Requirement: AdanosAdapter

系统 SHALL 提供 `AdanosAdapter` 类，实现 `SentimentProvider` 接口。Adapter SHALL 通过引用 `@/lib/actions/adanos.actions` 来调用现有函数 `getStockSentimentInsights()`，不得修改 `adanos.actions.ts` 中的任何代码。

Adapter SHALL 负责格式转换：将 `adanos.helpers.ts` 中定义的 `StockSentimentInsights` 类型映射为统一的 `SentimentResult` 类型。

`SentimentResult` SHALL 与现有 `StockSentimentCard` 组件完全兼容，组件无需修改。
`AdanosAdapter` SHALL 自动注册为 `"adanos"`，作为默认的 `SentimentProvider`。

#### Scenario: getSentiment delegates to adanos.actions

- **WHEN** `AdanosAdapter.getSentiment("AAPL", 7)` is called
- **THEN** it SHALL internally call `adanos.actions.getStockSentimentInsights("AAPL", 7)` and transform the result to `SentimentResult`

#### Scenario: SentimentResult is compatible with StockSentimentCard

- **WHEN** `StockSentimentCard` receives a `SentimentResult` produced by `AdanosAdapter`
- **THEN** the component SHALL render without any prop type errors, displaying `averageBuzz`, `bullishAverage`, `sourceAlignment`, and source cards

#### Scenario: Missing API key returns null

- **WHEN** `ADANOS_API_KEY` is not configured
- **THEN** `getSentiment()` SHALL return `null` without throwing

### Requirement: Sentiment data format mapping

Adapter SHALL 将 Adanos 的源通道映射为 `SentimentSource` 标准格式：

| Adanos 源 | sourceKey | sourceLabel |
|---|---|---|
| `/reddit/...` | `reddit` | Reddit |
| `/x/...` | `x` | X.com |
| `/news/...` | `news` | News |
| `/polymarket/...` | `polymarket` | Polymarket |

`averageBuzz` SHALL 为所有源的 `buzzScore` 平均值。`sourceAlignment` SHALL 由 `getSourceAlignment()` 函数从 `bullishValues` 数组计算得出。

#### Scenario: Multi-source sentiment aggregation

- **WHEN** Adanos returns data for 3 out of 4 source channels
- **THEN** `SentimentResult.availableSources` SHALL equal 3 and `averageBuzz` SHALL be the mean of the 3 `buzzScore` values
