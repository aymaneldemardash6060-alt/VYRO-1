import express, { type Request } from 'express';
import { apiRouter } from '../src/server/routes/api.ts';

const app = express();

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// vercel.json rewrites /api/<route> to this one shared function. Vercel
// forwards the captured route as the `path` query parameter; restore the
// original Express URL so the existing /api router and query parameters work.
app.use((req: Request, _res, next) => {
  const capturedPath = req.query.path;
  if (typeof capturedPath === 'string') {
    const incoming = new URL(req.url, 'http://vercel.local');
    incoming.searchParams.delete('path');
    const route = capturedPath.replace(/^\/+/, '');
    const remainingQuery = incoming.searchParams.toString();
    req.url = `/api/${route}${remainingQuery ? `?${remainingQuery}` : ''}`;
  } else if (!req.url.split('?')[0].startsWith('/api')) {
    // Also tolerate direct invocation of the function without a rewrite.
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }
  next();
});

app.use('/api', apiRouter);

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'API route not found.' });
});

export default app;
