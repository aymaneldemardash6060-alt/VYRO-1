/**
 * VYRO Commerce — Production Express & Vite Full-Stack Server
 * 
 * Runs on port 3000, serving:
 * 1. Server-side API routes (/api/*) with tamper-proof security & adapter integrations
 * 2. Vite development middleware (or static build in production)
 */

import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './src/server/routes/api.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProduction = process.env.NODE_ENV === 'production';

  // Middlewares
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logger in dev
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      const start = Date.now();
      res.on('finish', () => {
        const ms = Date.now() - start;
        console.log(`[API] ${req.method} ${req.path} -> ${res.statusCode} (${ms}ms)`);
      });
    }
    next();
  });

  // Mount VYRO Server API
  app.use('/api', apiRouter);

  // Health endpoint for Cloud Run
  app.get('/healthz', (req, res) => {
    res.json({ status: 'healthy', platform: 'VYRO Commerce', timestamp: new Date().toISOString() });
  });

  // Vite Integration
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 VYRO Commerce Server running on http://0.0.0.0:${PORT}`);
    console.log(`📦 Multi-Supplier Integration Architecture Active`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start VYRO server:', err);
  process.exit(1);
});
