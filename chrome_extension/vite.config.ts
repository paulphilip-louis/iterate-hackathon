import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync, renameSync, existsSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  assetsInclude: ['**/*.PNG', '**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.svg'],
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
        // Copy icons to dist
        const iconsDir = resolve(__dirname, 'dist/icons')
        if (!existsSync(iconsDir)) {
          mkdirSync(iconsDir, { recursive: true })
        }
        const iconSizes = [16, 48, 128]
        iconSizes.forEach(size => {
          const iconPath = resolve(__dirname, `public/icons/icon-${size}.png`)
          const distIconPath = resolve(__dirname, `dist/icons/icon-${size}.png`)
          if (existsSync(iconPath)) {
            copyFileSync(iconPath, distIconPath)
          }
        })
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
          return chunkInfo.name === 'background' ? 'background.js' : 'assets/[name].js';
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

