import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

// Cria o equivalente ao __dirname de forma compatível com ES Modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Atalho elegante para importar arquivos usando '@/'
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Escuta em todas as interfaces de rede (essencial para o Docker e Dokploy)
    host: '0.0.0.0',
    
    // Define a tua porta de produção/teste para o Frontend
    port: 9091,
    
    // Permite que o Ngrok, sslip.io ou qualquer domínio aceda sem o erro "Invalid Host"
    allowedHosts: true      
  }
})