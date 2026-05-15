## ADDED Requirements

### Requirement: Symbol Format Conversion

系统 SHALL 提供符号格式转换工具模块 `symbol-code.ts`。模块 SHALL 支持以下格式间的互转：

- **Finnhub 格式**: `AAPL`（美股纯 ticker）、`2330.TW`（点后缀交易所代码）
- **Tushare 格式**: `600519.SH`、`000001.SZ`（点后缀，交易所区分 SH/SZ/BJ）
- **stock-sdk 格式**: `sh600519`、`sz000001`（交易所前缀 + ticker）
- **TradingView 格式**: `SSE:600519`、`TWSE:2330`（交易所前缀 + 冒号 + ticker）

模块 SHALL 导出以下工具函数：

- `normalizeSymbol(input: string, targetFormat: string): string` — 统一格式转换
- `detectMarket(symbol: string): 'us' | 'ashare' | 'hk' | 'unknown'` — 市场识别
- `toTushareSymbol(symbol: string): string` — 转换为 Tushare 格式
- `toSDKSymbol(symbol: string): string` — 转换为 stock-sdk 格式

#### Scenario: Convert Tushare symbol to TradingView format

- **WHEN** `normalizeSymbol("600519.SH", "tradingview")` is called
- **THEN** it SHALL return `SSE:600519`

#### Scenario: Convert US ticker stays unchanged

- **WHEN** `normalizeSymbol("AAPL", "tushare")` is called
- **THEN** it SHALL return `AAPL` (no exchange suffix needed)

#### Scenario: Detect A-share market from symbol

- **WHEN** `detectMarket("000001.SZ")` is called
- **THEN** it SHALL return `'ashare'`

### Requirement: Multi-Market Auto-Routing

`getMarketProviderForSymbol(symbol: string): MarketDataProvider` SHALL 根据符号格式自动选择 Provider。

路由表 SHALL 基于正则模式匹配：

| 模式 | Provider |
|---|---|
| `^\d{6}\.(SH\|SZ\|BJ)$` | `tushare`（若已注册，否则默认） |
| `^\d{5}\.(SH\|SZ)$` | `tushare`（若已注册，否则默认） |
| 其他 | 默认 Provider（通常 `finnhub`） |

路由表 SHALL 可通过追加正则规则扩展，无需修改路由函数主体。

#### Scenario: Auto-route A-share symbol to Tushare

- **WHEN** `TUSHARE_API_TOKEN` is configured and `getMarketProviderForSymbol("600519.SH")` is called
- **THEN** it SHALL return the `tushare` provider

#### Scenario: Auto-route US symbol to default provider

- **WHEN** `getMarketProviderForSymbol("AAPL")` is called
- **THEN** it SHALL return the default provider (`finnhub`)

#### Scenario: Fallback when target provider not registered

- **WHEN** a symbol matches a pattern whose provider is not registered (e.g., A-share symbol but no Tushare configured)
- **THEN** it SHALL fall back to the default provider
