import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Cambia en cada build → la app detecta despliegues nuevos y recarga sola
    __APP_BUILD_ID__: JSON.stringify(Date.now().toString()),
  },
  build: {
    emptyOutDir: true,
  },
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
