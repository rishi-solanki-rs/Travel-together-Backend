import {
  incrementCounter,
  observeDurationMs,
  renderPrometheus,
} from '../../src/operations/metrics/metrics.service.js';

describe('Phase 7 metrics and tracing', () => {
  test('15) Prometheus output exposes counters and histogram summaries', () => {
    incrementCounter('tii_test_counter_total', 2, { module: 'metrics' });
    observeDurationMs('tii_test_duration_ms', 123.45, { module: 'metrics' });

    const output = renderPrometheus();
    expect(output).toContain('tii_test_counter_total{module="metrics"} 2');
    expect(output).toContain('tii_test_duration_ms{module="metrics"}_count 1');
  });
});
