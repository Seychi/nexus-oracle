import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import championsRouter from './routes/champions.js';
import buildsRouter from './routes/builds.js';
import matchupsRouter from './routes/matchups.js';
import summonerRouter from './routes/summoner.js';

const app = express();
const PORT = Number(process.env.PORT || 3001);

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '0.1.0',
  });
});

app.use('/api/champions', championsRouter);
app.use('/api/builds', buildsRouter);
app.use('/api/matchups', matchupsRouter);
app.use('/api/summoner', summonerRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server] Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[Server] Nexus Oracle API running on http://localhost:${PORT}`);
  console.log(`[Server] Health check: http://localhost:${PORT}/health`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
