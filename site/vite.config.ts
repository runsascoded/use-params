import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 50373,
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  build: {
    outDir: '../docs',
    emptyOutDir: true,
  },
})
