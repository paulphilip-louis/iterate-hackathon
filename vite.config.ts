import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync, renameSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    {
      name: 'copy-manifest',
      closeBundle() {
        copyFileSync(
          resolve(__dirname, 'manifest.json'),
          resolve(__dirname, 'dist/manifest.json')
        )
        // Rename index.html to sidepanel.html
        const indexHtmlPath = resolve(__dirname, 'dist/index.html')
        const sidepanelHtmlPath = resolve(__dirname, 'dist/sidepanel.html')
        if (existsSync(indexHtmlPath)) {
          renameSync(indexHtmlPath, sidepanelHtmlPath)
        }
        // Background.js is already in root from build output
      },
    },
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, 'index.html'),
        background: resolve(__dirname, 'src/background.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'background'
            ? '[name].js'
            : 'assets/[name].js';
        },
        chunkFileNames: 'assets/[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'index.html') {
            return 'sidepanel.html'
          }
          return 'assets/[name].[ext]'
        },
      },
    },
  },
})

