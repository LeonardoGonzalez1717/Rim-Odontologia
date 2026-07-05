import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy para redirigir llamadas /api al servidor PHP local
    // Ajusta el target según donde tengas XAMPP configurado
    proxy: {
      '/api': {
        target: 'http://localhost/Rim-Odontologia/frontend/backend',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
