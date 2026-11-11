import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { flip7Realtime } from './src/server/vitePlugin'

export default defineConfig({
  plugins: [react(), tailwindcss(), flip7Realtime()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
  },
})
