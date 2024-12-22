import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom'
  },
  server: {
    port: 5173,
    headers: {
      'Permissions-Policy': 'attribution-reporting=(), run-ad-auction=(), join-ad-interest-group=(), browsing-topics=(), private-state-token-redemption=(), private-state-token-issuance=()',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  }
})
