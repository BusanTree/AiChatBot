import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/AiChatBot/' : '/',
  plugins: [react()],
  server: {
    port: Number(process.env.PORT) || 5173,
  },
})
