## Why

OpenStock 当前仅支持 Finnhub（美股市场数据）和 Adanos（美股情绪分析）。要接入 A 股或其他市场数据，必须修改现有源码中的硬编码调用，破坏了与上游 GitHub 仓库的合并兼容性。需要一套可插拔的 Provider 扩展架构，在不修改任何现有源文件的前提下，让 OpenStock 能够按市场、按用途灵活切换数据源。

## What Changes

- **新增** Provider 接口体系：`MarketDataProvider`、`SentimentProvider`、`TradingCalendarProvider` 三个独立接口，按领域解耦
- **新增** 注册发现机制：通过环境变量驱动 Provider 选择，支持多市场自动路由
- **新增** Finnhub Adapter：将现有 `finnhub.actions.ts` 包装为 `MarketDataProvider` 实现（不改源码）
- **新增** Adanos Adapter：将现有 `adanos.actions.ts` 包装为 `SentimentProvider` 实现（不改源码）
- **新增** Tushare Provider：A 股生产环境市场数据（REST API）
- **新增** stock-sdk Provider：A 股研究/备选市场数据（npm 零依赖包）
- **新增** 交易日历系统：支持美股（内置）和 A 股（Tushare `trade_cal` API + 节假日）
- **新增** 符号格式转换工具：统一美股/A 股/TradingView 之间的代码格式互转
- **新增** npm 依赖：`stock-sdk`

## Capabilities

### New Capabilities

- `provider-core`: Provider 接口定义（MarketDataProvider / SentimentProvider / TradingCalendarProvider）+ 注册发现机制 + 环境变量驱动的工厂函数
- `provider-market-data`: Finnhub Adapter + Tushare Provider + stock-sdk Provider。A 股 Provider 的 `getNews()` 暂时降级返回空数组
- `provider-sentiment`: Adanos Adapter，统一 `SentimentResult` 输出，兼容现有 `StockSentimentCard` 组件
- `provider-calendar`: 美股交易日历（US）+ A 股交易日历（A-share，含中国节假日）
- `provider-multi-market`: 符号格式转换工具 + `getMarketProviderForSymbol()` 多市场自动路由

### Modified Capabilities

（无。现有功能不变，所有变更为纯新增。）

## Impact

- 受影响的目录: `lib/providers/`（全部新增，约 18 个文件）
- 零修改: `lib/actions/`、`components/`、`app/`、`lib/inngest/`、`middleware/`、`types/`
- 新增 npm 依赖: `stock-sdk`（ISC 许可证，零自身依赖，< 20KB）
- 新增环境变量: `MARKET_DATA_PROVIDER`、`SENTIMENT_PROVIDER`、`CALENDAR_PROVIDER`、`AUTO_SELECT_PROVIDER`、`TUSHARE_API_TOKEN`
- 回滚方案: 删除 `lib/providers/` 目录，卸载 `stock-sdk` 即可恢复原状。`MARKET_DATA_PROVIDER` 默认为 `finnhub`，不配置时行为完全不变
