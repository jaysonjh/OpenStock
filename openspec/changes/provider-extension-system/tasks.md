## 1. 基础设施搭建

- [ ] 1.1 创建目录结构 `lib/providers/core/`, `lib/providers/market/{finnhub,tushare,stock-sdk}/`, `lib/providers/sentiment/adanos/`, `lib/providers/calendar/{us,ashare}/`
- [ ] 1.2 安装 stock-sdk: `pnpm add stock-sdk`

## 2. Provider Core — 接口与注册机制

- [ ] 2.1 创建 `lib/providers/core/types.ts`: 定义 `MarketDataProvider`, `SentimentProvider`, `TradingCalendarProvider` 接口及所有统一数据类型 (`Quote`, `CompanyProfile`, `SearchResult`, `NewsArticle`, `WatchlistItem`, `SentimentResult`, `SentimentSource`)
- [ ] 2.2 创建 `lib/providers/core/registry.ts`: 实现 `registerMarketProvider`, `registerSentimentProvider`, `registerCalendarProvider` 注册函数和 `getMarketProvider`, `getSentimentProvider`, `getCalendarProvider` 获取函数 (env 驱动)
- [ ] 2.3 在 `registry.ts` 中实现 `getMarketProviderForSymbol(symbol)`: 多市场自动路由 (正则匹配符号格式 → Provider)
- [ ] 2.4 创建 `lib/providers/core/index.ts`: 条件加载各 Provider 的 `index.ts` (默认 Provider 无条件加载，条件 Provider 仅 env 存在时加载)
- [ ] 2.5 创建 `lib/providers/index.ts`: 顶层导出入口

## 3. Market Data — Finnhub Adapter

- [ ] 3.1 创建 `lib/providers/market/finnhub/adapter.ts`: 实现 `FinnhubAdapter` 类，引用 `@/lib/actions/finnhub.actions` 实现所有 `MarketDataProvider` 方法，完成 Finnhub 格式 → 标准类型转换
- [ ] 3.2 创建 `lib/providers/market/finnhub/index.ts`: 调用 `registerMarketProvider('finnhub', () => new FinnhubAdapter())`
- [ ] 3.3 验证: 不设置 `MARKET_DATA_PROVIDER` 环境变量时，`getMarketProvider()` 返回 Finnhub Adapter

## 4. Market Data — Tushare Provider

- [ ] 4.1 创建 `lib/providers/market/tushare/types.ts`: Tushare API 响应类型定义
- [ ] 4.2 创建 `lib/providers/market/tushare/provider.ts`: 实现 `TushareProvider` 类，通过 `fetch()` 调用 Tushare REST API，`getNews()` 返回 `[]`
- [ ] 4.3 在 provider.ts 中实现符号规范化: 支持 `600519.SH` / `600519` 两种输入格式
- [ ] 4.4 创建 `lib/providers/market/tushare/index.ts`: 调用 `registerMarketProvider('tushare', ...)`
- [ ] 4.5 验证: 设置 `MARKET_DATA_PROVIDER=tushare` + `TUSHARE_API_TOKEN` 后 `getMarketProvider()` 返回 TushareProvider

## 5. Market Data — stock-sdk Provider

- [ ] 5.1 创建 `lib/providers/market/stock-sdk/types.ts`: stock-sdk 响应类型定义
- [ ] 5.2 创建 `lib/providers/market/stock-sdk/provider.ts`: 实现 `StockSDKProvider` 类，通过 `import { StockSDK } from 'stock-sdk'` 获取数据，`getNews()` 返回 `[]`
- [ ] 5.3 在 provider.ts 中实现符号格式转换: `600519.SH` ↔ `sh600519`; `searchStocks()` 使用 stock-sdk 的 `search()` 方法
- [ ] 5.4 创建 `lib/providers/market/stock-sdk/index.ts`: 调用 `registerMarketProvider('stock-sdk', ...)`
- [ ] 5.5 验证: 设置 `MARKET_DATA_PROVIDER=stock-sdk` 后 `getMarketProvider()` 返回 StockSDKProvider

## 6. Symbol Code — 符号格式转换

- [ ] 6.1 创建 `lib/providers/market/symbol-code.ts`: 实现 `normalizeSymbol()`, `detectMarket()`, `toTushareSymbol()`, `toSDKSymbol()` 工具函数
- [ ] 6.2 新增 A 股交易所映射: `.SH` → SSE, `.SZ` → SZSE, `.BJ` → BSE
- [ ] 6.3 验证: `normalizeSymbol("600519.SH", "tushare")` → `"600519.SH"`, `normalizeSymbol("600519.SH", "sdk")` → `"sh600519"`

## 7. Sentiment — Adanos Adapter

- [ ] 7.1 创建 `lib/providers/sentiment/adanos/adapter.ts`: 实现 `AdanosAdapter` 类，引用 `@/lib/actions/adanos.actions` 实现 `SentimentProvider` 接口，完成 `StockSentimentInsights` → `SentimentResult` 格式映射
- [ ] 7.2 创建 `lib/providers/sentiment/adanos/index.ts`: 调用 `registerSentimentProvider('adanos', ...)`
- [ ] 7.3 验证: `AdanosAdapter.getSentiment()` 返回的 `SentimentResult` 与 `StockSentimentCard` 组件的 props 类型兼容

## 8. Calendar — 美股交易日历

- [ ] 8.1 创建 `lib/providers/calendar/us/provider.ts`: 实现 `USTradingCalendar` 类，包含周末判断 + 固定节假日列表 (New Year's, MLK Day, Presidents' Day, Good Friday, Memorial Day, Independence Day, Labor Day, Thanksgiving, Christmas)
- [ ] 8.2 创建 `lib/providers/calendar/us/index.ts`: 调用 `registerCalendarProvider('us', ...)`
- [ ] 8.3 验证: `isTradingDay(new Date("2026-05-16"))` (周六) → `false`, `isTradingDay(new Date("2026-05-18"))` (周一) → `true`

## 9. Calendar — A 股交易日历

- [ ] 9.1 创建 `lib/providers/calendar/ashare/provider.ts`: 实现 `AShareTradingCalendar` 类，启动时通过 Tushare `trade_cal` API 拉取全年交易日，内存缓存，含中国节假日 (春节、国庆等)
- [ ] 9.2 创建 `lib/providers/calendar/ashare/index.ts`: 调用 `registerCalendarProvider('ashare', ...)`
- [ ] 9.3 验证: 设置 `CALENDAR_PROVIDER=ashare` + `TUSHARE_API_TOKEN` 后，`getCalendarProvider()` 返回 `AShareTradingCalendar`; `isTradingDay` 对春节日期返回 `false`

## 10. 验证与文档

- [ ] 10.1 运行 `pnpm test` 确认所有现有测试通过，无回归
- [ ] 10.2 运行 `pnpm lint` 确认无新增 lint 错误
- [ ] 10.3 运行 `git diff --name-only` 确认仅 `lib/providers/` 和 `openspec/` 目录下有变更，无现有源文件被修改
- [ ] 10.4 更新 `AGENTS.md` 补充 Provider 架构说明
