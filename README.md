### Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Build tool and dev server

### Project Structure

```
iterate/
├── src/
│   ├── App.tsx          # Main React component
│   ├── main.tsx          # React entry point
│   └── index.css         # Tailwind CSS imports
├── index.html            # HTML template
├── manifest.json         # Chrome extension manifest
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── package.json          # Dependencies and scripts
```

### Setup Instructions

0. **Use the right node version**

```
nvm i && nvm use
```

1. **Install Dependencies**:

   ```bash
   npm install
   ```

2. **Development**:

   ```bash
   npm run dev
   ```

   This will build the extension in watch mode. The output will be in the `dist/` folder.

3. **Production Build**:

   ```bash
   npm run build
   ```

   This creates an optimized production build in the `dist/` folder.

4. **Load the Extension in Chrome**:

   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in the top right)
   - Click "Load unpacked"
   - Select the `dist/` folder (not the root folder)
   - The extension should now appear in your extensions list

### Development Workflow

1. Make changes to files in the `src/` directory
2. Run `npm run dev` to watch for changes and rebuild automatically
3. Reload the extension in Chrome (click the reload icon on the extension card)
4. Test your changes
