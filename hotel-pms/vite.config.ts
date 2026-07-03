import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url' // 1. Importa esta ferramenta nativa

// 2. Cria o equivalente ao __dirname de forma compatível com ES Modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Agora o path.resolve(__dirname) vai funcionar perfeitamente e sem erros!
    alias: { 
      '@': path.resolve(__dirname, './src') 
    },
  },
  server: { 
    proxy: { 
      '/api': { 
        target: 'http://backend-app:9090',
        changeOrigin: true, 
        rewrite: (p) => p.replace(/^\/api/, '') 
      } 
    } 
  },
})