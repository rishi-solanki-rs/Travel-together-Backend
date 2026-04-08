const counters = new Map();
const gauges = new Map();
const histograms = new Map();

const labelsToSuffix = (labels = {}) => {
  const entries = Object.entries(labels);
  if (!entries.length) return '';
  const normalized = entries
    .map(([key, value]) => `${key}="${String(value).replace(/"/g, '\\"')}"`)
    .join(',');
  return `{${normalized}}`;
};

const keyWithLabels = (name, labels = {}) => `${name}${labelsToSuffix(labels)}`;

const incrementCounter = (name, value = 1, labels = {}) => {
  const key = keyWithLabels(name, labels);
  counters.set(key, (counters.get(key) || 0) + value);
};

const setGauge = (name, value, labels = {}) => {
  const key = keyWithLabels(name, labels);
  gauges.set(key, Number(value) || 0);
};

const observeDurationMs = (name, durationMs, labels = {}) => {
  const key = keyWithLabels(name, labels);
  const bucket = histograms.get(key) || { count: 0, sum: 0, max: 0 };
  bucket.count += 1;
  bucket.sum += Number(durationMs) || 0;
  bucket.max = Math.max(bucket.max, Number(durationMs) || 0);
  histograms.set(key, bucket);
};

const startTimer = (name, labels = {}) => {
  const start = process.hrtime.bigint();
  return () => {
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    observeDurationMs(name, elapsedMs, labels);
    return elapsedMs;
  };
};

const renderPrometheus = () => {
  const lines = [];

  lines.push('# TYPE tii_counter counter');
  for (const [key, value] of counters.entries()) {
    lines.push(`${key} ${value}`);
  }

  lines.push('# TYPE tii_gauge gauge');
  for (const [key, value] of gauges.entries()) {
    lines.push(`${key} ${value}`);
  }

  lines.push('# TYPE tii_histogram summary');
  for (const [key, value] of histograms.entries()) {
    lines.push(`${key}_count ${value.count}`);
    lines.push(`${key}_sum ${value.sum.toFixed(3)}`);
    lines.push(`${key}_max ${value.max.toFixed(3)}`);
  }

  return `${lines.join('\n')}\n`;
};

const getSnapshot = () => ({
  counters: Object.fromEntries(counters.entries()),
  gauges: Object.fromEntries(gauges.entries()),
  histograms: Object.fromEntries(Array.from(histograms.entries()).map(([key, value]) => [key, { ...value }])),
});

export {
  incrementCounter,
  setGauge,
  observeDurationMs,
  startTimer,
  renderPrometheus,
  getSnapshot,
};
