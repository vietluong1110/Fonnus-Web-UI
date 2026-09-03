import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/*
 * `base: './'` so the build drops on any host at any path — that is also why the
 * app uses hash routes rather than the History API. See src/hooks/useRoute.ts.
 *
 * The dev proxy is how the frontend reaches a local backend without CORS. With
 * VITE_API_BASE_URL=/api/v1 the browser only ever talks to this dev server, so
 * there is no preflight, no Access-Control-Allow-Credentials, and no SameSite
 * argument to have until production. See docs/backend-integration.md.
 */
export default defineConfig(({ mode }) => {
  // '' loads every var, not just VITE_-prefixed ones: the proxy target is read
  // here, by the config, and is never inlined into the app bundle.
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_DEV_API_TARGET || 'http://localhost:3000'

  return {
    plugins: [react()],
    base: './',
    server: {
      // Honour PORT so the harness can assign a free one; 5180 otherwise.
      port: Number(process.env.PORT) || 5180,
      proxy: {
        '/api': {
          target,
          // false keeps the Host header as localhost, so a Domain-scoped cookie
          // from a local backend stays usable. Set true only when pointing at a
          // remote staging host that routes by Host.
          changeOrigin: false,
          secure: false,
          // For the day the voice session is a WebSocket.
          ws: true,
          // The backend mounts its own prefix, so strip ours: a request to
          // /api/v1/tenant/config reaches the backend as /v1/tenant/config.
          // If the backend mounts at the root instead, drop this line.
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
