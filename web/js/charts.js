// Chart.js wrappers for every chart in the app. initStockChart() draws the
// price-history line chart used on Home, Stock Detail, Buy/Sell, and the
// Portfolio/auth preview panels. initDoughnutChart() draws the asset
// allocation donut on the Portfolio page.

// ── Theme + formatting helpers ──────────────────────────────────────────────

// Read a CSS variable straight from the page so charts always match the
// current theme instead of hard-coding colors in JS.
function cssVar(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function firstFontFamily(stack) {
  return stack.split(',')[0].replace(/['"]/g, '').trim();
}

function hexToRgb(hex) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return match
    ? `${parseInt(match[1], 16)}, ${parseInt(match[2], 16)}, ${parseInt(match[3], 16)}`
    : '74, 222, 128';
}

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2,
});
const axisPriceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0,
});

function formatPrice(value) {
  return priceFormatter.format(value);
}

function formatAxisPrice(value) {
  return axisPriceFormatter.format(value);
}

// Demo datasets elsewhere in the app use plain labels like "Day 5" or a
// bare index number — only try to read a real date out of labels that
// actually look like one, and fall back to showing the raw label otherwise.
function parseLabelDate(label) {
  if (label instanceof Date) return label;
  if (typeof label === 'string') {
    const parsed = new Date(label);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function formatAxisDate(label, spanDays) {
  const date = parseLabelDate(label);
  if (!date) return String(label);
  if (spanDays > 540) return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  if (spanDays > 1.5) return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatTooltipDate(label) {
  const date = parseLabelDate(label);
  if (!date) return String(label);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Crosshair plugin ─────────────────────────────────────────────────────────
// Draws a thin dashed vertical line through the hovered point — the
// hover-line effect seen on most trading platform charts — without pulling
// in a separate plugin dependency.
const crosshairPlugin = {
  id: 'priceCrosshair',
  afterDraw(chart, _args, pluginOptions) {
    const active = chart.getActiveElements();
    if (!active || !active.length) return;

    const { ctx, chartArea } = chart;
    const x = active[0].element.x;

    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = pluginOptions?.color || 'rgba(255,255,255,0.25)';
    ctx.moveTo(x, chartArea.top);
    ctx.lineTo(x, chartArea.bottom);
    ctx.stroke();
    ctx.restore();
  },
};

// ── Placeholder / loading-skeleton overlays ──────────────────────────────────

function clearChartOverlays(canvas) {
  canvas.parentElement?.querySelectorAll('.chart-placeholder, .chart-skeleton').forEach((el) => el.remove());
  canvas.style.display = 'block';
}

function showChartPlaceholder(canvas) {
  canvas.style.display = 'none';
  const placeholder = document.createElement('div');
  placeholder.className = 'chart-placeholder';
  placeholder.innerHTML = `
    <p class="muted mono" style="margin:0;">Chart data currently unavailable</p>
    <small class="muted">Market Closed or API Limit reached</small>
  `;
  canvas.after(placeholder);
}

// Show an animated shimmer in place of the canvas while data is loading.
// Call this right before an async fetch — initStockChart() clears it
// automatically as soon as real data is drawn.
export function showChartSkeleton(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  canvas.style.display = 'none';
  if (canvas.parentElement.querySelector('.chart-skeleton')) return;
  const skeleton = document.createElement('div');
  skeleton.className = 'chart-skeleton';
  canvas.after(skeleton);
}

// ── Doughnut chart (Portfolio → Asset Allocation) ───────────────────────────

export function initDoughnutChart(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;

  const existing = Chart.getChart(canvasId);
  if (existing) existing.destroy();

  new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: data.labels,
      datasets: [{
        data: data.values,
        backgroundColor: data.colors,
        borderWidth: 2,
        borderColor: cssVar('--panel', '#0d1929'),
        hoverBorderColor: cssVar('--panel', '#0d1929'),
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '65%',
      devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      animation: { duration: 600, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
    },
  });
}

// ── Price history line chart ─────────────────────────────────────────────────
// chartData: { labels: [...], prices: [...] }
// opts.compact: true for small embedded/decorative charts (Portfolio's mini
// performance chart, the auth-page preview chart) — no axes, tooltip, or
// crosshair, just a clean trend line, since there isn't room for more.
export function initStockChart(canvasId, chartData, opts = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (typeof Chart === 'undefined') {
    console.error("Chart.js is not loaded. Check the script tag in the HTML.");
    return;
  }

  clearChartOverlays(canvas);

  if (!chartData || !chartData.prices || chartData.prices.length === 0) {
    showChartPlaceholder(canvas);
    return;
  }

  const existingChart = Chart.getChart(canvasId);
  if (existingChart) existingChart.destroy();

  const compact = Boolean(opts.compact);
  const prices  = chartData.prices;
  const labels  = chartData.labels || [];
  const isUp    = prices[prices.length - 1] >= prices[0];

  const upColor   = cssVar('--green', '#4ade80');
  const downColor = cssVar('--red', '#f87171');
  const lineColor = isUp ? upColor : downColor;
  const lineRgb   = hexToRgb(lineColor);
  const gridColor = cssVar('--border', 'rgba(255,255,255,0.12)');
  const mutedColor = cssVar('--muted', '#9aa0a6');
  const textColor  = cssVar('--text', '#e4e2e4');
  const panelColor = cssVar('--panel-2', '#15151a');
  const sansFont   = firstFontFamily(cssVar('--font-sans', 'Inter, system-ui, sans-serif'));
  const monoFont   = firstFontFamily(cssVar('--font-mono', 'JetBrains Mono, monospace'));

  // Roughly how many days the visible range spans — picks a sensible tick
  // format (time of day vs day+month vs month+year) without needing a
  // date-adapter library.
  const firstDate = parseLabelDate(labels[0]);
  const lastDate  = parseLabelDate(labels[labels.length - 1]);
  const spanDays  = (firstDate && lastDate) ? Math.abs(lastDate - firstDate) / 86400000 : 30;

  new Chart(canvas, {
    type: 'line',
    plugins: compact ? [] : [crosshairPlugin],
    data: {
      labels,
      datasets: [{
        data: prices,
        borderColor: lineColor,
        backgroundColor: (ctx) => {
          const { chartArea, ctx: canvasCtx } = ctx.chart;
          if (!chartArea) return `rgba(${lineRgb}, 0.16)`;
          const gradient = canvasCtx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, `rgba(${lineRgb}, 0.30)`);
          gradient.addColorStop(1, `rgba(${lineRgb}, 0)`);
          return gradient;
        },
        fill: true,
        tension: 0.35,
        cubicInterpolationMode: 'monotone',
        borderWidth: compact ? 1.75 : 2.5,
        pointRadius: 0,
        pointHoverRadius: compact ? 0 : 5,
        pointHoverBackgroundColor: lineColor,
        pointHoverBorderColor: panelColor,
        pointHoverBorderWidth: 2,
        pointHitRadius: 14,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      animation: { duration: 650, easing: 'easeOutQuart' },
      interaction: { mode: 'index', intersect: false },
      layout: { padding: compact ? 0 : { top: 6, right: 4, bottom: 0, left: 4 } },
      plugins: {
        legend: { display: false },
        priceCrosshair: { color: gridColor },
        tooltip: compact ? { enabled: false } : {
          enabled: true,
          mode: 'index',
          intersect: false,
          backgroundColor: panelColor,
          titleColor: textColor,
          bodyColor: mutedColor,
          borderColor: gridColor,
          borderWidth: 1,
          padding: 12,
          cornerRadius: 10,
          displayColors: false,
          titleFont: { size: 12, weight: '700', family: sansFont },
          bodyFont: { size: 12, family: monoFont },
          callbacks: {
            title: (items) => formatTooltipDate(labels[items[0].dataIndex]),
            label: (item) => {
              const i = item.dataIndex;
              const price = prices[i];
              const prev = i > 0 ? prices[i - 1] : price;
              const change = price - prev;
              const pct = prev ? (change / prev) * 100 : 0;
              const sign = change >= 0 ? '+' : '';
              return [
                `Price   ${formatPrice(price)}`,
                `Change  ${sign}${change.toFixed(2)} (${sign}${pct.toFixed(2)}%)`,
              ];
            },
          },
        },
      },
      scales: compact ? {
        x: { display: false },
        y: { display: false },
      } : {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: {
            color: mutedColor,
            font: { size: 11, family: sansFont },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 7,
            callback: (_value, index) => formatAxisDate(labels[index], spanDays),
          },
        },
        y: {
          position: 'right',
          grace: '8%',
          grid: { color: gridColor },
          border: { display: false },
          ticks: {
            color: mutedColor,
            font: { size: 11, family: monoFont },
            maxTicksLimit: 5,
            callback: (value) => formatAxisPrice(value),
          },
        },
      },
    },
  });
}
