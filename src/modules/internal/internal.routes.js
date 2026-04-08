import express from 'express';
import { renderPrometheus, getSnapshot } from '../../operations/metrics/metrics.service.js';
import { getFinanceDashboard } from '../../operations/finance/reconciliation.service.js';
import { getDlqStats } from '../../operations/queue/queue.service.js';

const router = express.Router();

router.get('/metrics', async (req, res) => {
  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.status(200).send(renderPrometheus());
});

router.get('/ops/summary', async (req, res) => {
  const [finance, dlq] = await Promise.all([getFinanceDashboard(), getDlqStats()]);
  res.status(200).json({ metricsSnapshot: getSnapshot(), finance, dlq });
});

export default router;
