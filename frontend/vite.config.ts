import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.BASE_URL ?? (process.env.GITHUB_ACTIONS ? '/AgML-Hub/' : '/'),
  plugins: [react()],
})
