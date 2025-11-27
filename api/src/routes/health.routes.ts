/**
 * Health Check Routes
 */

import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /api/health
 * Health check endpoint for load balancers and monitoring
 */
router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

/**
 * GET /api/health/ready
 * Readiness check - indicates if the service is ready to accept traffic
 */
router.get('/ready', (req: Request, res: Response) => {
  // Add checks for database connections, external services, etc.
  const isReady = true; // Replace with actual readiness logic

  if (isReady) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready' });
  }
});

export default router;
