import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import startServer from './dist/server/server.js';

const app = new Hono();

// Serve static assets from the client build output
app.use('/*', serveStatic({ root: './dist/client' }));

// Forward all other requests to the TanStack Start SSR handler
app.all('/*', async (c) => {
  try {
    const res = await startServer.fetch(c.req.raw, {}, {});
    return res;
  } catch (err) {
    console.error('SSR Error:', err);
    return c.text('Internal Server Error', 500);
  }
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
console.log(`Server starting on port ${port}...`);

serve({
  fetch: app.fetch,
  port
});
