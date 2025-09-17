# Stock Chart Viewer (Chat UI)

This feature renders an interactive stock chart inside the chat tool results when the `stockChartAndVolatility` tool is used.

## Where it lives
- Component: `components/markets/stock-chart-viewer.tsx`
- Wiring: `app/components/chat/tool-invocation.tsx` (detects `stockChartAndVolatility` and renders the viewer)

## How it works
- Loads TradingView widget (`tv.js`) once and embeds a chart for the `symbol`.
- Maps the tool payload fields:
  - `symbol`, `period`, `timeframe`
  - `finance_summary` (price, currency, as_of)
  - `volatility_proxy` (quick intraday estimate)
  - `chart_candidates` (Yahoo/Google Finance links + thumbnails as fallback)
- If TradingView is disabled or fails to load, the component shows quick links (Yahoo/Google) and the volatility panel.

## Environment control
- `NEXT_PUBLIC_ENABLE_TRADINGVIEW=true` (default). Set `false` to disable the TradingView embed (compliance / privacy / CSP).

## Persistence
- Persists preferred exchange per symbol in `localStorage` under `stock_exchange_pref:<SYMBOL>`.

## Usage
1. Run an agent that calls `stockChartAndVolatility` (e.g., Apu‑Markets) with a request like: _"Muestra el gráfico y volatilidad de AAPL en 1M diario"_.
2. Open the "Tools executed" section; the chart and metrics will appear in the tool card.

## Future improvements
- Add a pure in‑app chart using Lightweight Charts for environments without external widgets.
- Add a settings toggle in UI to control TradingView without editing env.
- Skyvern screenshot integration for exporting static images.
