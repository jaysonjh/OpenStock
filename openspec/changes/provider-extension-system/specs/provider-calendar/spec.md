## ADDED Requirements

### Requirement: USTradingCalendar

系统 SHALL 提供 `USTradingCalendar` 类，实现 `TradingCalendarProvider` 接口，覆盖美股市场。实现 SHALL 基于静态规则（周末非交易日 + 固定节假日列表），不依赖外部 API。

美股主要节假日 SHALL 包括：New Year's Day, Martin Luther King Jr. Day, Presidents' Day, Good Friday, Memorial Day, Independence Day, Labor Day, Thanksgiving Day, Christmas Day。

`USTradingCalendar` SHALL 自动注册为 `"us"`，作为默认的 `TradingCalendarProvider`。

#### Scenario: Saturday is not a trading day

- **WHEN** `isTradingDay(new Date("2026-05-16"))` is called (a Saturday)
- **THEN** it SHALL return `false`

#### Scenario: Weekday is a trading day

- **WHEN** `isTradingDay(new Date("2026-05-18"))` is called (a Monday, not a holiday)
- **THEN** it SHALL return `true`

#### Scenario: Get next trading day from Friday

- **WHEN** `getNextTradingDay(new Date("2026-05-15"))` is called (Friday)
- **THEN** it SHALL return the following Monday's date

### Requirement: AShareTradingCalendar

系统 SHALL 提供 `AShareTradingCalendar` 类，实现 `TradingCalendarProvider` 接口，覆盖 A 股市场（上海/深圳）。实现 SHALL 在启动时通过 Tushare `trade_cal` API 拉取全年交易日数据并内存缓存。节假日判定 SHALL 包含中国特有节假日（春节、国庆、清明、端午、中秋等）。

`AShareTradingCalendar` SHALL 自动注册为 `"ashare"`，仅在 `TUSHARE_API_TOKEN` 存在时加载。

#### Scenario: Get A-share trading calendar for current year

- **WHEN** `AShareTradingCalendar` is initialized with a valid `TUSHARE_API_TOKEN`
- **THEN** it SHALL fetch and cache the full-year trading calendar from Tushare's `trade_cal` API

#### Scenario: Chinese Spring Festival is not a trading day

- **WHEN** `isTradingDay(someDateDuringSpringFestival)` is called
- **THEN** it SHALL return `false`

#### Scenario: Regular weekday during A-share market hours

- **WHEN** `isTradingDay(aRegularWeekday)` is called and the date is not a holiday
- **THEN** it SHALL return `true`

### Requirement: Calendar provider selection

`CALENDAR_PROVIDER` 环境变量 SHALL 控制使用哪个交易日历实现。默认值为 `"us"`。

#### Scenario: Switch to A-share calendar via env

- **WHEN** `CALENDAR_PROVIDER=ashare` and `getCalendarProvider()` is called
- **THEN** the system SHALL return the `AShareTradingCalendar` instance
