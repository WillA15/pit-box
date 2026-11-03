import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, serve /api/* from the same handler files Vercel deploys, so `npm run dev` matches production.
function devApi() {
  return {
    name: 'pit-box-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const match = req.url?.match(/^\/api\/([a-z-]+)(?:\?|$)/);
        if (!match) return next();
        try {
          const mod = await server.ssrLoadModule(`/api/${match[1]}.js`);
          await mod.default(req, res);
        } catch (err) {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'not_found', message: String(err.message ?? err) }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devApi()],
  test: {
    include: ['tests/unit/**/*.test.js'],
  },
});
