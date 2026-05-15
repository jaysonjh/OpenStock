## ADDED Requirements

### Requirement: Finnhub Adapter

系统 SHALL 提供 `FinnhubAdapter` 类，实现 `MarketDataProvider` 接口。Adapter SHALL 通过引用 `@/lib/actions/finnhub.actions` 来调用现有函数，不得修改 `finnhub.actions.ts` 中的任何代码。

Adapter SHALL 负责格式转换：将 `finnhub.actions` 返回的 Finnhub 特定格式转换为统一的 `Quote`、`CompanyProfile`、`SearchResult` 等标准类型。

Finnhub Adapter SHALL 自动注册为 `"finnhub"`，作为默认的 `MarketDataProvider`。

#### Scenario: getQuote delegates to finnhub.actions

- **WHEN** `FinnhubAdapter.getQuote("AAPL")` is called
- **THEN** it SHALL internally call `finnhub.actions.getQuote("AAPL")` and transform the result to the standard `Quote` type

#### Scenario: searchStocks delegates to finnhub.actions

- **WHEN** `FinnhubAdapter.searchStocks("apple")` is called
- **THEN** it SHALL internally call `finnhub.actions.searchStocks("apple")` and return `SearchResult[]`

#### Scenario: getNews delegates to finnhub.actions

- **WHEN** `FinnhubAdapter.getNews({ symbols: ["AAPL"] })` is called
- **THEN** it SHALL internally call `finnhub.actions.getNews(["AAPL"])` and return `NewsArticle[]`

### Requirement: TushareProvider

系统 SHALL 提供 `TushareProvider` 类，实现 `MarketDataProvider` 接口。Provider SHALL 通过 HTTP POST 调用 Tushare REST API (`api.tushare.pro`)。认证 SHALL 使用环境变量 `TUSHARE_API_TOKEN`。

Provider SHALL 支持 Tushare 符号格式 `600519.SH`、`000001.SZ` 以及简化格式。
Provider 的 `getNews()` 方法 SHALL 返回空数组 `[]`（本次不实现 A 股新闻）。

TushareProvider SHALL 自动注册为 `"tushare"`，仅在 `TUSHARE_API_TOKEN` 存在时加载。

#### Scenario: Get A-share quote via Tushare

- **WHEN** `TUSHARE_API_TOKEN` is configured and `getQuote("600519.SH")` is called
- **THEN** the provider SHALL call `POST /api/v1/tushare` with `api_name: "daily"` and return a `Quote` with `price`, `change`, `changePercent`

#### Scenario: Symbol normalization for Tushare

- **WHEN** `getQuote("600519")` is called (without exchange suffix)
- **THEN** the provider SHALL normalize it to `600519.SH` before making the API call

### Requirement: StockSDKProvider

系统 SHALL 提供 `StockSDKProvider` 类，实现 `MarketDataProvider` 接口。Provider SHALL 通过 npm 包 `stock-sdk` (`import { StockSDK } from 'stock-sdk'`) 获取数据。

Provider 的 `getNews()` 方法 SHALL 返回空数组 `[]`（stock-sdk 不提供新闻接口）。
Provider 的 `searchStocks()` SHALL 调用 `stock-sdk` 的 `search()` 方法，支持中文拼音搜索。

StockSDKProvider SHALL 自动注册为 `"stock-sdk"`，仅在所有依赖可用时加载。

#### Scenario: Get A-share quote via stock-sdk

- **WHEN** `getQuote("600519.SH")` is called on the stock-sdk provider
- **THEN** it SHALL call `StockSDK.getSimpleQuotes(["sh600519"])` and transform the result

#### Scenario: Search A-shares by Chinese pinyin

- **WHEN** `searchStocks("maotai")` is called
- **THEN** it SHALL call `StockSDK.search("maotai")` and return matching results

### Requirement: A-share getNews degradation

对于所有 A 股 Provider（Tushare / stock-sdk），`getNews()` 方法在本次实现中 SHALL 返回空数组 `[]`。调用方 SHALL 处理空数组（不崩溃、不显示新闻区域或显示"No news available"）。

后续可通过新增独立的 `NewsProvider` 接口或扩展 `MarketDataProvider` 来补充 A 股新闻能力。

#### Scenario: getNews returns empty for A-share providers

- **WHEN** `getNews({ symbols: ["600519.SH"] })` is called on TushareProvider or StockSDKProvider
- **THEN** the method SHALL return an empty array `[]` without error

### Requirement: File constraints — zero-touch principle

所有本次变更的文件 SHALL 仅在 `lib/providers/` 目录下创建。以下现有文件 SHALL 不被修改：

- `lib/actions/finnhub.actions.ts`
- `lib/actions/adanos.actions.ts`
- `lib/inngest/functions.ts`
- `lib/utils.ts`
- `components/` 下所有文件
- `app/` 下所有文件
- `middleware/index.ts`
- `next.config.ts`
- `tsconfig.json`

#### Scenario: Verification that no existing source file is modified

- **WHEN** running `git diff --name-only` comparing the change branch to the base
- **THEN** only files under `lib/providers/` and `openspec/` SHALL appear as changed
