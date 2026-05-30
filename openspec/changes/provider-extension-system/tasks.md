## 1. 基础设施搭建

- [x] 1.1 创建目录结构
- [x] 1.2 安装 stock-sdk: pnpm add stock-sdk

## 2. Provider Core — 接口与注册机制

- [x] 2.1 创建 core/types.ts: MarketDataProvider / SentimentProvider / TradingCalendarProvider 接口及统一数据类型
- [x] 2.2 创建 core/registry.ts: registerXxx / getXxx 注册和获取函数 (env 驱动)
- [x] 2.3 在 registry.ts 中实现 getMarketProviderForSymbol(symbol): 多市场自动路由
- [x] 2.4 创建 core/index.ts: 条件加载各 Provider 的 index.ts
- [x] 2.5 创建 providers/index.ts: 顶层导出入口

## 3. Market Data — Finnhub Adapter

- [x] 3.1 创建 market/finnhub/adapter.ts: FinnhubAdapter 包装 finnhub.actions
- [x] 3.2 创建 market/finnhub/index.ts: registerMarketProvider('finnhub', ...)
- [x] 3.3 验证: 默认 env 时 getMarketProvider() 返回 Finnhub Adapter

## 4. Market Data — Tushare Provider

- [x] 4.1 创建 market/tushare/types.ts: Tushare API 响应类型
- [x] 4.2 创建 market/tushare/provider.ts: TushareProvider 实现 (getNews 返回 [])
- [x] 4.3 符号规范化: 支持 600519.SH / 600519 / sh600519 格式
- [x] 4.4 创建 market/tushare/index.ts: registerMarketProvider('tushare', ...)
- [x] 4.5 验证: TUSHARE_API_TOKEN 设置后 getMarketProvider() 返回 TushareProvider

## 5. Market Data — stock-sdk Provider

- [x] 5.1 创建 market/stock-sdk/types.ts: stock-sdk 响应类型
- [x] 5.2 创建 market/stock-sdk/provider.ts: StockSDKProvider 实现
- [x] 5.3 符号格式转换: 600519.SH 与 sh600519 双向转换
- [x] 5.4 创建 market/stock-sdk/index.ts: registerMarketProvider('stock-sdk', ...)
- [x] 5.5 验证: MARKET_DATA_PROVIDER=stock-sdk 返回 StockSDKProvider

## 6. Symbol Code — 符号格式转换

- [x] 6.1 创建 market/symbol-code.ts: normalizeSymbol / detectMarket / toTushareSymbol / toSDKSymbol / toTradingViewSymbol
- [x] 6.2 A 股交易所映射: .SH -> SSE, .SZ -> SZSE, .BJ -> BSE
- [x] 6.3 验证: 格式转换正确

## 7. Sentiment — Adanos Adapter

- [x] 7.1 创建 sentiment/adanos/adapter.ts: AdanosAdapter 包装 adanos.actions
- [x] 7.2 创建 sentiment/adanos/index.ts: registerSentimentProvider('adanos', ...)
- [x] 7.3 验证: SentimentResult 类型与 StockSentimentCard 组件兼容

## 8. Calendar — 美股交易日历

- [x] 8.1 创建 calendar/us/provider.ts: USTradingCalendar (算法生成节假日)
- [x] 8.2 创建 calendar/us/index.ts: registerCalendarProvider('us', ...)
- [x] 8.3 验证: 周末和非假日判断正确

## 9. Calendar — A 股交易日历

- [x] 9.1 创建 calendar/ashare/provider.ts: AShareTradingCalendar (Tushare trade_cal + 工作日 fallback)
- [x] 9.2 创建 calendar/ashare/index.ts: registerCalendarProvider('ashare', ...)
- [x] 9.3 验证: TUSHARE_API_TOKEN 存在时获取真实交易日历

## 10. 验证与文档

- [x] 10.1 pnpm test: 79 tests passed, 0 regressions
- [x] 10.2 pnpm lint: 0 new errors (only pre-existing script warnings)
- [x] 10.3 git status: 仅 package.json(改) + lib/providers/(新增), 无现有源文件被修改
- [x] 10.4 更新 AGENTS.md 补充 Provider 架构说明
