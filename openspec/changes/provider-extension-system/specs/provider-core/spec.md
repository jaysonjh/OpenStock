## ADDED Requirements

### Requirement: MarketDataProvider Interface

系统 SHALL 定义 `MarketDataProvider` 接口，作为所有市场行情数据源的统一契约。接口 SHALL 包含以下方法：

- `getQuote(symbol: string): Promise<Quote | null>` — 单只股票实时报价
- `getQuotes(symbols: string[]): Promise<Record<string, Quote | null>>` — 批量报价
- `getCompanyProfile(symbol: string): Promise<CompanyProfile | null>` — 公司概况
- `searchStocks(query?: string): Promise<SearchResult[]>` — 股票搜索
- `getNews(options?: NewsOptions): Promise<NewsArticle[]>` — 市场/个股新闻
- `getWatchlistData(symbols: string[]): Promise<WatchlistItem[]>` — 自选列表批量数据

返回类型（`Quote`, `CompanyProfile`, `SearchResult`, `NewsArticle`, `WatchlistItem`）SHALL 为统一标准类型，不绑定特定 Provider 的原始格式。所有方法 SHALL 返回 `Promise`，失败时 SHALL 返回 `null` 或空数组，不得抛出异常。

#### Scenario: Get quote for a valid US stock symbol

- **WHEN** `getQuote("AAPL")` is called on any registered `MarketDataProvider`
- **THEN** the method SHALL return a `Quote` object with fields `symbol`, `price`, `change`, `changePercent`, and `timestamp`

#### Scenario: Get quote for an unknown symbol

- **WHEN** `getQuote("INVALID")` is called and the provider cannot find the symbol
- **THEN** the method SHALL return `null` without throwing an exception

#### Scenario: Get batch quotes for multiple symbols

- **WHEN** `getQuotes(["AAPL", "MSFT"])` is called
- **THEN** the method SHALL return a `Record<string, Quote | null>` with one entry per requested symbol

### Requirement: SentimentProvider Interface

系统 SHALL 定义 `SentimentProvider` 接口，作为情绪分析数据源的统一契约。接口 SHALL 包含以下方法：

- `getSentiment(symbol: string, days?: number): Promise<SentimentResult | null>` — 单只股票跨源情绪快照
- `getSentiments?(symbols: string[], days?: number): Promise<Record<string, SentimentResult | null>>` — (可选) 批量情绪

`SentimentResult` SHALL 包含 `averageBuzz` (0-100), `bullishAverage` (0-100 | null), `sourceAlignment` (string), `availableSources` (number), 以及 `sources` 数组。每个 `SentimentSource` SHALL 包含 `sourceKey`, `sourceLabel`, `buzzScore`, `bullishPct`, `trend`, `metricLabel`, `metricValue`。

`StockSentimentCard` 组件 SHALL 无需修改即可消费 `SentimentResult` 类型。

#### Scenario: Get sentiment for a tracked stock

- **WHEN** `getSentiment("AAPL", 7)` is called on a registered `SentimentProvider`
- **THEN** the method SHALL return a `SentimentResult` with at least one source in the `sources` array

#### Scenario: Get sentiment when provider has no API key

- **WHEN** the required API key is not configured in environment variables
- **THEN** `getSentiment()` SHALL return `null` without throwing an exception

### Requirement: TradingCalendarProvider Interface

系统 SHALL 定义 `TradingCalendarProvider` 接口，作为交易日历的统一契约。接口 SHALL 包含以下方法：

- `isTradingDay(date: Date): boolean`
- `getNextTradingDay(from: Date): Date`
- `getPrevTradingDay(from: Date): Date`
- `getMarketHours(date: Date): { open: string; close: string; timezone: string }`
- `getHolidays(year: number): Date[]`

#### Scenario: Check if a weekday is a trading day

- **WHEN** `isTradingDay(new Date("2026-05-18"))` is called (a regular Monday)
- **THEN** for the US provider, it SHALL return `true`
- **THEN** for the A-share provider, it SHALL only return `true` if the date is not a Chinese holiday

### Requirement: Provider Registry

系统 SHALL 提供注册发现机制，通过 `registry.ts` 实现。三个领域 SHALL 使用独立注册表：

- `registerMarketProvider(name: string, factory: () => MarketDataProvider): void`
- `registerSentimentProvider(name: string, factory: () => SentimentProvider): void`
- `registerCalendarProvider(name: string, factory: () => TradingCalendarProvider): void`

获取函数 SHALL 按以下优先级选择 Provider：

1. 调用时显式传入的 `name` 参数
2. 对应的环境变量（`MARKET_DATA_PROVIDER` / `SENTIMENT_PROVIDER` / `CALENDAR_PROVIDER`）
3. 默认值（`finnhub` / `adanos` / `us`）

当请求的 Provider 名称未注册时，SHALL 抛出明确的错误信息，并列出所有已注册的 Provider 名称。

#### Scenario: Get default market provider without env variable

- **WHEN** `MARKET_DATA_PROVIDER` is not set and `getMarketProvider()` is called
- **THEN** the system SHALL return the `finnhub` provider instance

#### Scenario: Get market provider by env variable

- **WHEN** `MARKET_DATA_PROVIDER=tushare` and `getMarketProvider()` is called
- **THEN** the system SHALL return the `tushare` provider instance

#### Scenario: Get unknown provider raises error

- **WHEN** `getMarketProvider("unknown")` is called and no provider with that name is registered
- **THEN** the system SHALL throw an error with message listing available provider names

### Requirement: Provider Auto-Registration

每个 Provider 的 `index.ts` SHALL 在模块加载时调用对应的 `registerXxx()` 函数完成注册。`lib/providers/core/index.ts` SHALL 负责条件加载各 Provider 模块：

- 默认 Provider（finnhub / adanos / us）SHALL 无条件加载
- 条件 Provider（tushare / stock-sdk）SHALL 仅在对应环境变量存在时加载

#### Scenario: Finnhub is always available

- **WHEN** the application starts without any `MARKET_DATA_PROVIDER` env variable
- **THEN** `getMarketProvider()` SHALL return the finnhub provider

#### Scenario: Tushare is conditionally loaded

- **WHEN** `TUSHARE_API_TOKEN` is not set
- **THEN** the tushare provider SHALL NOT be registered, and requesting it SHALL raise an error
