import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))
const rootEnvPath = path.resolve(projectRoot, '..', '.env')
const rootEnv = fs.existsSync(rootEnvPath) ? fs.readFileSync(rootEnvPath, 'utf8') : ''
const backendPort = rootEnv.match(/^PORT=(\d+)/m)?.[1] || process.env.PORT || '8000'
const backendTarget = `http://localhost:${backendPort}`

export default defineConfig({
  root: projectRoot,
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true
      },
      '/images': {
        target: backendTarget,
        changeOrigin: true
      },
      '/socket.io': {
        target: backendTarget,
        ws: true
      }
    }
  }
})
