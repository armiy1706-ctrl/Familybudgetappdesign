import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': '/',
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Увеличиваем лимит до 2000 кб, так как проект использует много тяжелых библиотек (Lucide, Recharts, Motion)
    chunkSizeWarningLimit: 2000,
    reportCompressedSize: false, // Отключаем детальный отчет для ускорения сборки
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': ['lucide-react', 'motion/react', 'sonner'],
          'vendor-charts': ['recharts'],
        },
      },
    },
  },
});
