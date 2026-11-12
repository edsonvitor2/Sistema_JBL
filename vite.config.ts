import basicSsl from '@vitejs/plugin-basic-ssl'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// HTTPS é obrigatório para o navegador liberar a câmera (leitor de código de barras)
// quando o tablet acessa o sistema pelo IP da rede (ex.: https://192.168.0.10:5173).
export default defineConfig({
  plugins: [react(), tailwindcss(), basicSsl()],
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
})
